import type { PRODUCT_CATEGORIES } from "@/lib/constants";

export type ProductCategory = keyof typeof PRODUCT_CATEGORIES;

/** Unidades de medida dos insumos. */
export const PRODUCT_UNITS = ["un", "caixa", "par", "ml"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  un: "Unidade (un)",
  caixa: "Caixa",
  par: "Par",
  ml: "Mililitro (ml)",
};

/** Validade pós-abertura padrão das colas (4 a 6 semanas). */
export const GLUE_SHELF_LIFE_DEFAULT = 35;

/** Spec de fios guardada em Product.specJson. */
export type ProductSpec = {
  curvatura: string | null;
  espessura: string | null;
  tamanho: string | null;
};

/** "D · 0.07 · 9mm" — só as partes preenchidas. */
export function specLabel(spec: ProductSpec | null): string | null {
  if (!spec) return null;
  const parts = [spec.curvatura, spec.espessura, spec.tamanho].filter(
    (p): p is string => Boolean(p),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Quantidades podem ser fracionadas (ml, consumo médio). */
export function formatQty(quantity: number): string {
  return quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export type MovementItem = {
  id: string;
  type: "ENTRADA" | "BAIXA" | "AJUSTE";
  quantity: number;
  reason: string | null;
  /** "dd/MM às HH:mm" no fuso da profissional. */
  dateLabel: string;
};

/** Dados serializáveis de um insumo para os componentes client do módulo. */
export type ProductItem = {
  id: string;
  name: string;
  category: ProductCategory;
  spec: ProductSpec | null;
  specLabel: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  costCents: number | null;
  usagePerService: number;
  active: boolean;
  /** quantity <= minQuantity (abaixo do mínimo). */
  lowStock: boolean;
  // Cola: abertura + validade pós-abertura
  /** "yyyy-MM-dd" p/ input de data. */
  openedAtKey: string | null;
  /** "dd/MM" p/ exibição. */
  openedAtLabel: string | null;
  shelfLifeDaysAfterOpen: number | null;
  /** Dias até vencer a cola aberta (negativo = vencida); null se não abriu. */
  glueDaysLeft: number | null;
  // Validade impressa na embalagem
  expiresAtKey: string | null;
  expiresAtLabel: string | null;
  expiresDaysLeft: number | null;
  /** Últimas movimentações (mais recentes primeiro). */
  movements: MovementItem[];
};
