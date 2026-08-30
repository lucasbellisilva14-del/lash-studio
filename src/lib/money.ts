/** Dinheiro sempre em centavos (Int). Formatação pt-BR. */

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "1.234,56" | "1234,56" | "1234.56" | "R$ 89,90" → centavos */
export function parseBRL(input: string): number {
  const cleaned = input.replace(/[R$\s.]/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function applyFee(amountCents: number, feePct: number) {
  const feeCents = Math.round((amountCents * feePct) / 100);
  return { feeCents, netCents: amountCents - feeCents };
}
