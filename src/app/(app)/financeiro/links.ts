/** Financeiro — estado da tela na URL (?mes=yyyy-MM&aba=...&prof=...). Puro. */
import { ALL_KEY } from "@/lib/team-shared";

export type Aba = "visao" | "lancamentos" | "comissoes";

const ABAS: readonly string[] = ["visao", "lancamentos", "comissoes"];

export function isAba(value: unknown): value is Aba {
  return typeof value === "string" && ABAS.includes(value);
}

export function primeiro(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Monta o link do Financeiro omitindo os padrões (mês corrente, Visão geral, Estúdio todo). */
export function financeiroHref(
  estado: { mes: string; aba?: Aba; prof?: string },
  mesAtual: string,
  hash?: string,
): string {
  const params = new URLSearchParams();
  if (estado.mes !== mesAtual) params.set("mes", estado.mes);
  if (estado.aba && estado.aba !== "visao") params.set("aba", estado.aba);
  if (estado.prof && estado.prof !== ALL_KEY) params.set("prof", estado.prof);
  const query = params.toString();
  return `/financeiro${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
