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
  active: boolean;
};

/** 150 → "2h30" · 90 → "1h30" · 60 → "1h" · 45 → "45min" */
export function formatDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
