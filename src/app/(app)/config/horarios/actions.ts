"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { timeToMinutes } from "@/lib/dates";
import { type ConfigFormState, fieldErrorsFrom } from "../form-state";
import { TIME_RE, intField } from "../validation";

const numbersSchema = z.object({
  bufferMinutes: intField(0, 240, "Informe um número de 0 a 240 minutos."),
  minAdvanceHours: intField(0, 168, "Informe um número de 0 a 168 horas."),
});

export async function salvarHorariosAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const professionalId = await requireProfessionalId();

  const fieldErrors: Record<string, string> = {};

  const days: {
    weekday: number;
    active: boolean;
    startTime: string;
    endTime: string;
  }[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    const active = formData.get(`active-${weekday}`) === "on";
    const startTime = String(formData.get(`start-${weekday}`) ?? "");
    const endTime = String(formData.get(`end-${weekday}`) ?? "");

    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      fieldErrors[`day-${weekday}`] = "Informe horários válidos.";
    } else if (active && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      fieldErrors[`day-${weekday}`] = "O fim deve ser depois do início.";
    }
    days.push({ weekday, active, startTime, endTime });
  }

  const parsedNumbers = numbersSchema.safeParse({
    bufferMinutes: String(formData.get("bufferMinutes") ?? ""),
    minAdvanceHours: String(formData.get("minAdvanceHours") ?? ""),
  });
  if (!parsedNumbers.success) {
    Object.assign(fieldErrors, fieldErrorsFrom(parsedNumbers.error));
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Revise os campos destacados.", fieldErrors };
  }
  if (!parsedNumbers.success) {
    return { ok: false, error: "Revise os campos destacados." };
  }

  try {
    await prisma.$transaction([
      ...days.map((d) =>
        prisma.workingHour.upsert({
          where: {
            professionalId_weekday: { professionalId, weekday: d.weekday },
          },
          create: {
            professionalId,
            weekday: d.weekday,
            startTime: d.startTime,
            endTime: d.endTime,
            active: d.active,
          },
          update: {
            startTime: d.startTime,
            endTime: d.endTime,
            active: d.active,
          },
        }),
      ),
      prisma.professional.update({
        where: { id: professionalId },
        data: {
          bufferMinutes: parsedNumbers.data.bufferMinutes,
          minAdvanceHours: parsedNumbers.data.minAdvanceHours,
        },
      }),
    ]);
  } catch {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Horários afetam agenda e disponibilidade no app inteiro.
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
