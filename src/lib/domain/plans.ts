/**
 * Planos do LashOS: SOLO (uma lash) e EMPRESA (estúdio com equipe).
 * O preço fica congelado em Professional.planPriceCents (o admin pode calibrar).
 */

export const PLANS = {
  SOLO: { label: "Lash solo", priceCents: 4990, descricao: "Para quem atende sozinha" },
  EMPRESA: { label: "Empresa", priceCents: 12000, descricao: "Estúdio com equipe e comissões" },
} as const;

export type PlanKey = keyof typeof PLANS;

export const TRIAL_DIAS = 7;

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "SOLO" || value === "EMPRESA";
}

/** Código da vendedora: letras e números, sem espaços, em maiúsculas (3 a 16). */
export function normalizeSellerCode(raw: unknown): string | null {
  const code = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code.length >= 3 && code.length <= 16 ? code : null;
}

/** A conta criada no site precisa salvar o cartão antes de entrar no app. */
export function precisaCadastrarCartao(p: {
  signupSource: string;
  subscriptionStatus: string;
}): boolean {
  return p.signupSource === "SITE" && p.subscriptionStatus === "TRIAL";
}
