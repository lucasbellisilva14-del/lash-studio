"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireProfessionalId } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { dayKeyToUtcStart } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { ExpenseCategory } from "@/components/financeiro/types";

export type FinanceiroActionState = { ok: boolean; error: string | null };

const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORIES) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

const expenseSchema = z.object({
  id: z.string().nullable(),
  description: z
    .string()
    .trim()
    .min(2, { message: "Descreva a despesa (mín. 2 letras)." })
    .max(80, { message: "Descrição muito longa (máx. 80 caracteres)." }),
  category: z.enum(CATEGORY_KEYS, { message: "Escolha uma categoria válida." }),
  amountCents: z
    .number()
    .int()
    .min(1, { message: "Informe um valor válido (ex.: 89,90)." })
    .max(100_000_000, { message: "Valor acima do limite permitido." }),
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Informe a data da despesa." }),
  recurrence: z.enum(["AVULSA", "FIXA_MENSAL"], {
    message: "Escolha a recorrência da despesa.",
  }),
});

/** Cria (sem id) ou edita (com id) uma despesa. Usado pelo Sheet do formulário. */
export async function saveExpense(
  _prev: FinanceiroActionState,
  formData: FormData,
): Promise<FinanceiroActionState> {
  const professional = await requireProfessional();

  const parsed = expenseSchema.safeParse({
    id: (formData.get("id") as string | null) || null,
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    amountCents: parseBRL(String(formData.get("amount") ?? "")),
    dateKey: String(formData.get("date") ?? ""),
    recurrence: formData.get("recurrence") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const date = dayKeyToUtcStart(data.dateKey, professional.timezone);

  if (data.id) {
    const existing = await prisma.transaction.findFirst({
      where: { id: data.id, professionalId: professional.id, type: "DESPESA" },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Despesa não encontrada." };

    await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        category: data.category,
        amountCents: data.amountCents,
        netCents: data.amountCents,
        recurrence: data.recurrence,
        date,
      },
    });
  } else {
    await prisma.transaction.create({
      data: {
        professionalId: professional.id,
        type: "DESPESA",
        kind: "OUTRO",
        description: data.description,
        category: data.category,
        amountCents: data.amountCents,
        netCents: data.amountCents,
        feePct: 0,
        feeCents: 0,
        recurrence: data.recurrence,
        date,
      },
    });
  }

  revalidatePath("/financeiro");
  return { ok: true, error: null };
}

/** Exclui uma despesa (receitas de sinal/atendimento são somente leitura). */
export async function deleteExpense(
  _prev: FinanceiroActionState,
  formData: FormData,
): Promise<FinanceiroActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Despesa inválida." };

  const expense = await prisma.transaction.findFirst({
    where: { id, professionalId, type: "DESPESA" },
    select: { id: true },
  });
  if (!expense) return { ok: false, error: "Despesa não encontrada." };

  await prisma.transaction.delete({ where: { id: expense.id } });

  revalidatePath("/financeiro");
  return { ok: true, error: null };
}

/** Define/atualiza a meta de faturamento do mês (upsert). */
export async function saveGoal(
  _prev: FinanceiroActionState,
  formData: FormData,
): Promise<FinanceiroActionState> {
  const professionalId = await requireProfessionalId();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { ok: false, error: "Mês inválido." };
  }

  const targetCents = parseBRL(String(formData.get("target") ?? ""));
  if (targetCents <= 0) {
    return { ok: false, error: "Informe um valor de meta válido (ex.: 5.000)." };
  }
  if (targetCents > 100_000_000) {
    return { ok: false, error: "Valor de meta acima do limite permitido." };
  }

  await prisma.goal.upsert({
    where: { professionalId_month: { professionalId, month } },
    update: { revenueTargetCents: targetCents },
    create: { professionalId, month, revenueTargetCents: targetCents },
  });

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { ok: true, error: null };
}
