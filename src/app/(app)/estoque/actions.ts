"use server";

/**
 * Server actions do módulo Estoque.
 * Multi-tenant: toda escrita valida que o insumo pertence à profissional.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireProfessionalId } from "@/lib/session";
import { parseBRL } from "@/lib/money";
import { dayKeyToUtcStart } from "@/lib/dates";
import { CURVATURES, PRODUCT_CATEGORIES, THICKNESSES } from "@/lib/constants";
import {
  GLUE_SHELF_LIFE_DEFAULT,
  PRODUCT_UNITS,
  type ProductCategory,
} from "@/components/estoque/types";

export type EstoqueActionState = { ok: boolean; error: string | null };

const CATEGORY_KEYS = Object.keys(PRODUCT_CATEGORIES) as [
  ProductCategory,
  ...ProductCategory[],
];

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "1,5" | "1.5" | "12" → número; null quando vazio/ilegível. */
function parseDecimal(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}

function textOrNull(value: FormDataEntryValue | null, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function revalidateEstoque() {
  revalidatePath("/estoque");
  revalidatePath("/"); // alertas da home
}

const productSchema = z.object({
  id: z.string().nullable(),
  name: z
    .string()
    .trim()
    .min(2, { message: "Informe o nome do insumo (mín. 2 letras)." })
    .max(80, { message: "Nome muito longo (máx. 80 caracteres)." }),
  category: z.enum(CATEGORY_KEYS, { message: "Escolha uma categoria válida." }),
  unit: z.enum(PRODUCT_UNITS, { message: "Escolha uma unidade válida." }),
  quantity: z
    .number({ message: "Informe uma quantidade válida." })
    .min(0, { message: "A quantidade não pode ser negativa." })
    .max(999_999, { message: "Quantidade acima do limite." }),
  minQuantity: z
    .number({ message: "Informe um estoque mínimo válido." })
    .min(0, { message: "O mínimo não pode ser negativo." })
    .max(999_999, { message: "Mínimo acima do limite." }),
  costCents: z
    .number()
    .int()
    .min(0)
    .max(100_000_000, { message: "Custo acima do limite permitido." })
    .nullable(),
  usagePerService: z
    .number({ message: "Informe um consumo médio válido." })
    .min(0, { message: "O consumo médio não pode ser negativo." })
    .max(9_999, { message: "Consumo médio acima do limite." }),
  curvatura: z.string().nullable(),
  espessura: z.string().nullable(),
  tamanho: z
    .string()
    .trim()
    .max(40, { message: "Tamanho muito longo (máx. 40 caracteres)." })
    .nullable(),
  openedAt: z
    .string()
    .regex(DAY_KEY_RE, { message: "Data de abertura inválida." })
    .nullable(),
  shelfLifeDaysAfterOpen: z
    .number({ message: "Informe a validade pós-abertura em dias." })
    .int({ message: "A validade pós-abertura deve ser em dias inteiros." })
    .min(1, { message: "Validade pós-abertura mínima: 1 dia." })
    .max(365, { message: "Validade pós-abertura máxima: 365 dias." })
    .nullable(),
  expiresAt: z
    .string()
    .regex(DAY_KEY_RE, { message: "Data de validade inválida." })
    .nullable(),
});

/** Cria (sem id) ou edita (com id) um insumo. Usado pelo Sheet do formulário. */
export async function saveProductAction(
  _prev: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  const professional = await requireProfessional();
  const professionalId = professional.id;
  const tz = professional.timezone;

  const costRaw = textOrNull(formData.get("cost"), 20);

  const parsed = productSchema.safeParse({
    id: (formData.get("id") as string | null) || null,
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    unit: formData.get("unit") ?? "",
    quantity: parseDecimal(formData.get("quantity")) ?? 0,
    minQuantity: parseDecimal(formData.get("minQuantity")) ?? 0,
    costCents: costRaw ? parseBRL(costRaw) : null,
    usagePerService: parseDecimal(formData.get("usagePerService")) ?? 0,
    curvatura: textOrNull(formData.get("curvatura"), 10),
    espessura: textOrNull(formData.get("espessura"), 10),
    tamanho: textOrNull(formData.get("tamanho"), 40),
    openedAt: textOrNull(formData.get("openedAt"), 10),
    shelfLifeDaysAfterOpen: parseDecimal(formData.get("shelfLifeDaysAfterOpen")),
    expiresAt: textOrNull(formData.get("expiresAt"), 10),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  // Spec só faz sentido para FIOS (curvatura/espessura validadas no vocabulário).
  let specJson: string | null = null;
  if (data.category === "FIOS") {
    const curvatura =
      data.curvatura && (CURVATURES as readonly string[]).includes(data.curvatura)
        ? data.curvatura
        : null;
    const espessura =
      data.espessura && (THICKNESSES as readonly string[]).includes(data.espessura)
        ? data.espessura
        : null;
    const tamanho = data.tamanho || null;
    if (curvatura || espessura || tamanho) {
      specJson = JSON.stringify({
        ...(curvatura ? { curvatura } : {}),
        ...(espessura ? { espessura } : {}),
        ...(tamanho ? { tamanho } : {}),
      });
    }
  }

  // Abertura + validade pós-abertura só para COLA.
  const isGlue = data.category === "COLA";
  const openedAt = isGlue && data.openedAt ? dayKeyToUtcStart(data.openedAt, tz) : null;
  const shelfLifeDaysAfterOpen = isGlue
    ? (data.shelfLifeDaysAfterOpen ?? GLUE_SHELF_LIFE_DEFAULT)
    : null;
  const expiresAt = data.expiresAt ? dayKeyToUtcStart(data.expiresAt, tz) : null;

  const common = {
    name: data.name,
    category: data.category,
    specJson,
    unit: data.unit,
    minQuantity: roundQty(data.minQuantity),
    costCents: data.costCents,
    usagePerService: roundQty(data.usagePerService),
    openedAt,
    shelfLifeDaysAfterOpen,
    expiresAt,
  };

  if (data.id) {
    const existing = await prisma.product.findFirst({
      where: { id: data.id, professionalId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Insumo não encontrado." };

    // Quantidade não muda na edição — use as movimentações (entrada/baixa).
    await prisma.product.update({ where: { id: existing.id }, data: common });
  } else {
    const quantity = roundQty(data.quantity);
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { professionalId, ...common, quantity, active: true },
      });
      if (quantity > 0) {
        await tx.stockMovement.create({
          data: {
            professionalId,
            productId: product.id,
            type: "ENTRADA",
            quantity,
            reason: "Estoque inicial",
          },
        });
      }
    });
  }

  revalidateEstoque();
  return { ok: true, error: null };
}

/** Movimentação manual: ENTRADA (soma; custo opcional) ou BAIXA (subtrai, nunca negativa). */
export async function registerMovementAction(
  _prev: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  const professionalId = await requireProfessionalId();

  const typeRaw = String(formData.get("type") ?? "");
  const type = typeRaw === "ENTRADA" || typeRaw === "BAIXA" ? typeRaw : null;
  if (!type) return { ok: false, error: "Movimentação inválida." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Insumo inválido." };

  const quantity = parseDecimal(formData.get("quantity"));
  if (quantity === null || quantity <= 0 || quantity > 999_999) {
    return { ok: false, error: "Informe uma quantidade maior que zero." };
  }
  const qty = roundQty(quantity);
  if (qty <= 0) return { ok: false, error: "Informe uma quantidade maior que zero." };

  const product = await prisma.product.findFirst({
    where: { id, professionalId },
    select: { id: true, quantity: true, active: true },
  });
  if (!product) return { ok: false, error: "Insumo não encontrado." };
  if (!product.active) {
    return { ok: false, error: "Insumo desativado — reative antes de movimentar." };
  }

  if (type === "ENTRADA") {
    const costRaw = textOrNull(formData.get("cost"), 20);
    const costCents = costRaw ? parseBRL(costRaw) : 0;
    if (costCents < 0 || costCents > 100_000_000) {
      return { ok: false, error: "Custo acima do limite permitido." };
    }
    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: roundQty(product.quantity + qty),
          ...(costCents > 0 ? { costCents } : {}),
        },
      }),
      prisma.stockMovement.create({
        data: {
          professionalId,
          productId: product.id,
          type: "ENTRADA",
          quantity: qty,
          reason: textOrNull(formData.get("reason")) ?? "Entrada manual",
        },
      }),
    ]);
  } else {
    const reason = textOrNull(formData.get("reason"));
    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        // Nunca deixa o estoque negativo.
        data: { quantity: Math.max(0, roundQty(product.quantity - qty)) },
      }),
      prisma.stockMovement.create({
        data: {
          professionalId,
          productId: product.id,
          type: "BAIXA",
          quantity: qty,
          reason: reason ?? "Baixa manual",
        },
      }),
    ]);
  }

  revalidateEstoque();
  return { ok: true, error: null };
}

/** "Abrir cola nova": zera a data de abertura para hoje (só categoria COLA). */
export async function openGlueAction(
  _prev: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Insumo inválido." };

  const product = await prisma.product.findFirst({
    where: { id, professionalId, category: "COLA" },
    select: { id: true, shelfLifeDaysAfterOpen: true },
  });
  if (!product) return { ok: false, error: "Cola não encontrada." };

  await prisma.product.update({
    where: { id: product.id },
    data: {
      openedAt: new Date(),
      shelfLifeDaysAfterOpen: product.shelfLifeDaysAfterOpen ?? GLUE_SHELF_LIFE_DEFAULT,
    },
  });

  revalidateEstoque();
  return { ok: true, error: null };
}

/** Soft delete: marca active=false (sai das listas e da baixa automática). */
export async function deactivateProductAction(
  _prev: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Insumo inválido." };

  const product = await prisma.product.findFirst({
    where: { id, professionalId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Insumo não encontrado." };

  await prisma.product.update({ where: { id: product.id }, data: { active: false } });

  revalidateEstoque();
  return { ok: true, error: null };
}

/** Reativa um insumo desativado. */
export async function reactivateProductAction(
  _prev: EstoqueActionState,
  formData: FormData,
): Promise<EstoqueActionState> {
  const professionalId = await requireProfessionalId();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Insumo inválido." };

  const product = await prisma.product.findFirst({
    where: { id, professionalId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "Insumo não encontrado." };

  await prisma.product.update({ where: { id: product.id }, data: { active: true } });

  revalidateEstoque();
  return { ok: true, error: null };
}
