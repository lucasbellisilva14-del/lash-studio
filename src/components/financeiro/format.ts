/** Formatação de dinheiro do Financeiro (sobre formatBRL de @/lib/money). */
import { formatBRL } from "@/lib/money";

/** Negativo com o sinal de menos tipográfico: "− R$ 120,00". */
export function formatSignedBRL(cents: number): string {
  return cents < 0 ? `− ${formatBRL(-cents)}` : formatBRL(cents);
}

/** Compacto para eixos: "R$ 500", "R$ 1,5 mil", "R$ 1,2 mi". */
export function formatBRLCompact(cents: number): string {
  const reais = cents / 100;
  const abs = Math.abs(reais);
  const numero = (n: number, casas: number) =>
    n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
  if (abs >= 1_000_000) return `R$ ${numero(reais / 1_000_000, 1)} mi`;
  if (abs >= 1_000) return `R$ ${numero(reais / 1_000, 1)} mil`;
  return `R$ ${numero(reais, 0)}`;
}

/** "3 atendimentos" / "1 atendimento" */
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
