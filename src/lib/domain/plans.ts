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

/**
 * Black LashOS: quem assina até o fim da campanha paga o 1º mês com desconto.
 * A assinatura nasce com o valor do 1º mês e, depois da 1ª cobrança aprovada,
 * o webhook volta ao preço cheio (Professional.promoPrimeiroMes).
 */
export const PROMO = {
  /** Desligada: ligar quando a campanha for aprovada. */
  ativa: false,
  nome: "Black LashOS",
  descontoPct: 50,
  /** 30/11/2026 23:59 em Brasília. */
  fim: new Date("2026-12-01T02:59:59Z"),
} as const;

export function promoAtiva(now = new Date()): boolean {
  return PROMO.ativa && now.getTime() <= PROMO.fim.getTime();
}

export function precoPrimeiroMes(priceCents: number): number {
  return Math.round((priceCents * (100 - PROMO.descontoPct)) / 100);
}
