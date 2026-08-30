"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { type ConfigFormState, fieldErrorsFrom } from "../form-state";
import { TIME_RE, intField } from "../validation";

const schema = z.object({
  depositType: z.enum(["PERCENT", "FIXED", "NONE"], {
    error: "Escolha como cobrar o sinal.",
  }),
  cancellationWindowHours: intField(0, 168, "Informe as horas (0 a 168)."),
  maintenanceLimitDays: intField(1, 90, "Informe os dias (1 a 90)."),
  maintenanceNoticeDay: intField(1, 90, "Informe o dia (1 a 90)."),
  noShowThreshold: intField(1, 20, "Informe o número de faltas (1 a 20)."),
  riskWindowDays: intField(1, 365, "Informe os dias (1 a 365)."),
  inactiveDays: intField(1, 730, "Informe os dias (1 a 730)."),
  dailySummaryTime: z.string().regex(TIME_RE, "Horário inválido."),
});

export async function salvarPoliticasAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const professionalId = await requireProfessionalId();

  const parsed = schema.safeParse({
    depositType: String(formData.get("depositType") ?? ""),
    cancellationWindowHours: String(formData.get("cancellationWindowHours") ?? ""),
    maintenanceLimitDays: String(formData.get("maintenanceLimitDays") ?? ""),
    maintenanceNoticeDay: String(formData.get("maintenanceNoticeDay") ?? ""),
    noShowThreshold: String(formData.get("noShowThreshold") ?? ""),
    riskWindowDays: String(formData.get("riskWindowDays") ?? ""),
    inactiveDays: String(formData.get("inactiveDays") ?? ""),
    dailySummaryTime: String(formData.get("dailySummaryTime") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const v = parsed.data;

  const fieldErrors: Record<string, string> = {};

  // Valor do sinal depende do tipo escolhido.
  let depositValue = 0;
  if (v.depositType === "PERCENT") {
    const n = Number(String(formData.get("depositPercent") ?? "").replace(",", "."));
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      fieldErrors.depositPercent = "Informe uma porcentagem de 1 a 100.";
    } else {
      depositValue = n;
    }
  } else if (v.depositType === "FIXED") {
    const cents = parseBRL(String(formData.get("depositFixed") ?? ""));
    if (cents <= 0) {
      fieldErrors.depositFixed = "Informe um valor maior que zero.";
    } else {
      depositValue = cents;
    }
  }

  if (v.maintenanceNoticeDay >= v.maintenanceLimitDays) {
    fieldErrors.maintenanceNoticeDay =
      "O dia do aviso deve vir antes do prazo máximo de manutenção.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Revise os campos destacados.", fieldErrors };
  }

  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        depositType: v.depositType,
        depositValue,
        cancellationWindowHours: v.cancellationWindowHours,
        maintenanceLimitDays: v.maintenanceLimitDays,
        maintenanceNoticeDay: v.maintenanceNoticeDay,
        noShowThreshold: v.noShowThreshold,
        riskWindowDays: v.riskWindowDays,
        inactiveDays: v.inactiveDays,
        dailySummaryTime: v.dailySummaryTime,
      },
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Políticas afetam agendamento, mensagens e status de clientes.
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
