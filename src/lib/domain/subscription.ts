/**
 * Assinatura do LashOS: regras de acesso.
 * CORTESIA nunca bloqueia · TRIAL bloqueia após trialEndsAt ·
 * ATIVA bloqueia após subscriptionPaidUntil + 3 dias de graça ·
 * SUSPENSA bloqueia imediatamente.
 */

export const GRACA_DIAS = 3;

export type AssinaturaCampos = {
  subscriptionStatus: string;
  subscriptionPaidUntil: Date | null;
  trialEndsAt: Date | null;
};

export function acessoBloqueado(p: AssinaturaCampos, now = new Date()): boolean {
  switch (p.subscriptionStatus) {
    case "SUSPENSA":
      return true;
    case "TRIAL":
      return p.trialEndsAt !== null && p.trialEndsAt.getTime() < now.getTime();
    case "ATIVA":
      return (
        p.subscriptionPaidUntil !== null &&
        p.subscriptionPaidUntil.getTime() + GRACA_DIAS * 24 * 3600_000 < now.getTime()
      );
    default: // CORTESIA (ou valor desconhecido — nunca trancar por engano)
      return false;
  }
}

export const STATUS_ASSINATURA_LABEL: Record<string, string> = {
  CORTESIA: "Cortesia",
  TRIAL: "Período de teste",
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
};
