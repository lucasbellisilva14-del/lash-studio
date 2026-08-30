/**
 * Sinal (depósito antecipado): % ou valor fixo, exigido pelo serviço
 * ou automaticamente após N no-shows da cliente.
 */

export type DepositPolicy = {
  depositType: string; // PERCENT | FIXED | NONE
  depositValue: number; // % (0-100) ou centavos
  noShowThreshold: number;
};

export function computeDeposit(params: {
  policy: DepositPolicy;
  serviceRequiresDeposit: boolean;
  clientNoShowCount: number;
  priceCents: number;
}): { required: boolean; depositCents: number; reason: "SERVICO" | "NO_SHOW" | null } {
  const { policy, serviceRequiresDeposit, clientNoShowCount, priceCents } = params;

  if (policy.depositType === "NONE") {
    return { required: false, depositCents: 0, reason: null };
  }

  const byNoShow = clientNoShowCount >= policy.noShowThreshold;
  const required = serviceRequiresDeposit || byNoShow;
  if (!required) return { required: false, depositCents: 0, reason: null };

  const depositCents =
    policy.depositType === "PERCENT"
      ? Math.round((priceCents * policy.depositValue) / 100)
      : Math.min(policy.depositValue, priceCents);

  return {
    required: true,
    depositCents,
    reason: byNoShow && !serviceRequiresDeposit ? "NO_SHOW" : "SERVICO",
  };
}
