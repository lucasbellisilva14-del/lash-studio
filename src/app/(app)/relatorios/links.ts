/** Relatórios — estado da tela na URL (?periodo=, ?mes=, ?prof=). Puro. */
import { ALL_KEY } from "@/lib/team-shared";
import type { PeriodoRelatorio } from "./data";

export function primeiro(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** ?periodo=30|90|365 (padrão 90). */
export function parsePeriodo(raw: string | undefined): PeriodoRelatorio {
  return raw === "30" ? 30 : raw === "365" ? 365 : 90;
}

/** /relatorios com o período e a profissional ("Estúdio todo" = sem ?prof). */
export function relatoriosHref(
  estado: { periodo: PeriodoRelatorio; prof?: string | null },
  hash?: string,
): string {
  const params = new URLSearchParams({ periodo: String(estado.periodo) });
  if (estado.prof && estado.prof !== ALL_KEY) params.set("prof", estado.prof);
  return `/relatorios?${params.toString()}${hash ? `#${hash}` : ""}`;
}

/** /relatorios/mensal com o mês ("yyyy-MM"; nulo = o mês corrente) e a profissional. */
export function fechamentoHref(estado: { mes?: string | null; prof?: string | null }): string {
  const params = new URLSearchParams();
  if (estado.mes) params.set("mes", estado.mes);
  if (estado.prof && estado.prof !== ALL_KEY) params.set("prof", estado.prof);
  const query = params.toString();
  return `/relatorios/mensal${query ? `?${query}` : ""}`;
}
