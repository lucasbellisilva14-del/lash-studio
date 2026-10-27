import type { ServiceCategory } from "@/lib/constants";

/** Dados serializáveis de um serviço para os componentes client do módulo. */
export type ServiceItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMin: number;
  priceCents: number;
  requiresDeposit: boolean;
  maintenanceOfId: string | null;
  maintenanceOfName: string | null;
  /** Retorno ideal em dias (lifting, brow, design, outro). Nulo = sem aviso. */
  returnDays: number | null;
  active: boolean;
};

/**
 * Categorias com "retorno ideal" próprio. Aplicação e manutenção seguem o
 * prazo de manutenção das Políticas; remoção não tem retorno. A Fila
 * (lib/domain/queue.ts) só usa returnDays fora do ciclo dos cílios.
 */
export const RETURN_DAYS_CATEGORIES: readonly ServiceCategory[] = [
  "LASH_LIFTING",
  "BROW_LAMINATION",
  "DESIGN_SOBRANCELHA",
  "OUTRO",
];
export const RETURN_DAYS_MIN = 1;
export const RETURN_DAYS_MAX = 365;

/** Sugestão ao escolher a categoria num serviço novo (os padrões da migração). */
export const RETURN_DAYS_SUGGESTED: Partial<Record<ServiceCategory, number>> = {
  LASH_LIFTING: 45,
  BROW_LAMINATION: 30,
  DESIGN_SOBRANCELHA: 20,
};

export function acceptsReturnDays(category: ServiceCategory): boolean {
  return RETURN_DAYS_CATEGORIES.includes(category);
}

/** 45 → "volta em 45 dias" · 1 → "volta em 1 dia" */
export function formatReturnDays(days: number): string {
  return days === 1 ? "volta em 1 dia" : `volta em ${days} dias`;
}

/** 150 → "2h30" · 90 → "1h30" · 60 → "1h" · 45 → "45min" */
export function formatDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
