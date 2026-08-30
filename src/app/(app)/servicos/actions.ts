"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";

export type ServiceActionState = { ok: boolean; error: string | null };

const CATEGORY_KEYS = Object.keys(SERVICE_CATEGORIES) as [
  ServiceCategory,
  ...ServiceCategory[],
];

const serviceSchema = z.object({
  id: z.string().nullable(),
  name: z
    .string()
    .trim()
    .min(2, { message: "Informe o nome do serviço (mín. 2 letras)." })
    .max(80, { message: "Nome muito longo (máx. 80 caracteres)." }),
  category: z.enum(CATEGORY_KEYS, { message: "Escolha uma categoria válida." }),
  durationMin: z
    .number({ message: "Informe a duração em minutos." })
    .int({ message: "A duração deve ser em minutos inteiros." })
    .min(5, { message: "Duração mínima: 5 minutos." })
    .max(600, { message: "Duração máxima: 10 horas (600 minutos)." }),
  priceCents: z
    .number()
    .int()
    .min(1, { message: "Informe um preço válido (ex.: 180 ou 180,00)." })
    .max(10_000_000, { message: "Preço acima do limite permitido." }),
  requiresDeposit: z.boolean(),
  maintenanceOfId: z.string().nullable(),
});

/** Cria (sem id) ou edita (com id) um serviço. Usado pelo Sheet do formulário. */
export async function saveService(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const professionalId = await requireProfessionalId();

  const parsed = serviceSchema.safeParse({
    id: (formData.get("id") as string | null) || null,
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    durationMin: Number(formData.get("durationMin")),
    priceCents: parseBRL(String(formData.get("price") ?? "")),
    requiresDeposit: formData.get("requiresDeposit") === "on",
    maintenanceOfId: (formData.get("maintenanceOfId") as string | null) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  // Vínculo de manutenção: obrigatório e validado só quando a categoria é MANUTENCAO.
  let maintenanceOfId: string | null = null;
  if (data.category === "MANUTENCAO") {
    if (!data.maintenanceOfId) {
      return { ok: false, error: "Escolha de qual aplicação esta manutenção é." };
    }
    if (data.maintenanceOfId === data.id) {
      return { ok: false, error: "A manutenção não pode ser vinculada a ela mesma." };
    }
    const linked = await prisma.service.findFirst({
      where: {
        id: data.maintenanceOfId,
        professionalId,
        category: "APLICACAO",
        active: true,
      },
      select: { id: true },
    });
    if (!linked) {
      return {
        ok: false,
        error: "A aplicação vinculada não existe ou está inativa. Escolha outra.",
      };
    }
    maintenanceOfId = linked.id;
  }

  if (data.id) {
    const existing = await prisma.service.findFirst({
      where: { id: data.id, professionalId },
      select: { id: true, category: true },
    });
    if (!existing) {
      return { ok: false, error: "Serviço não encontrado." };
    }

    // Aplicação com manutenção ativa vinculada não pode mudar de categoria.
    if (existing.category === "APLICACAO" && data.category !== "APLICACAO") {
      const linkedActive = await prisma.service.count({
        where: { professionalId, maintenanceOfId: existing.id, active: true },
      });
      if (linkedActive > 0) {
        return {
          ok: false,
          error:
            "Este serviço tem manutenção ativa vinculada a ele. Desative ou desvincule a manutenção antes de mudar a categoria.",
        };
      }
    }

    await prisma.service.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        category: data.category,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        requiresDeposit: data.requiresDeposit,
        maintenanceOfId,
      },
    });
  } else {
    await prisma.service.create({
      data: {
        professionalId,
        name: data.name,
        category: data.category,
        durationMin: data.durationMin,
        priceCents: data.priceCents,
        requiresDeposit: data.requiresDeposit,
        maintenanceOfId,
        active: true,
      },
    });
  }

  revalidatePath("/servicos");
  return { ok: true, error: null };
}

/** Soft delete: marca active=false. Bloqueia aplicação com manutenção ativa vinculada. */
export async function deactivateService(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Serviço inválido." };

  const service = await prisma.service.findFirst({
    where: { id, professionalId },
    select: { id: true, name: true, category: true },
  });
  if (!service) return { ok: false, error: "Serviço não encontrado." };

  const linkedActive = await prisma.service.count({
    where: { professionalId, maintenanceOfId: service.id, active: true },
  });
  if (linkedActive > 0) {
    return {
      ok: false,
      error:
        linkedActive === 1
          ? `Não dá para desativar "${service.name}": há 1 manutenção ativa vinculada a ele. Desative ou desvincule a manutenção primeiro.`
          : `Não dá para desativar "${service.name}": há ${linkedActive} manutenções ativas vinculadas a ele. Desative ou desvincule as manutenções primeiro.`,
    };
  }

  await prisma.service.update({ where: { id: service.id }, data: { active: false } });

  revalidatePath("/servicos");
  return { ok: true, error: null };
}

/** Reativa um serviço desativado. */
export async function reactivateService(
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Serviço inválido." };

  const service = await prisma.service.findFirst({
    where: { id, professionalId },
    select: { id: true },
  });
  if (!service) return { ok: false, error: "Serviço não encontrado." };

  await prisma.service.update({ where: { id: service.id }, data: { active: true } });

  revalidatePath("/servicos");
  return { ok: true, error: null };
}
