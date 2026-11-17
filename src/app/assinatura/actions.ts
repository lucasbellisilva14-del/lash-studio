"use server";

import { redirect } from "next/navigation";
import { getRequestOrigin } from "@/lib/domain/queue";
import { requireOwner, requireProfessional } from "@/lib/session";
import { assinaturasDisponiveis, criarAssinatura } from "@/lib/mp-subscription";
import { precoPrimeiroMes } from "@/lib/domain/plans";

export type AssinarState = { error?: string };

/** Cria a assinatura no MP e manda pro checkout de cartão hospedado. */
export async function assinarAction(): Promise<AssinarState> {
  await requireOwner();
  const professional = await requireProfessional();
  if (!assinaturasDisponiveis()) {
    return { error: "Assinatura indisponível no momento — fale com o suporte." };
  }

  // A volta do checkout precisa cair onde ela está logada.
  const origem = await getRequestOrigin();

  let initPoint: string;
  try {
    const r = await criarAssinatura({
      professionalId: professional.id,
      email: professional.email,
      studioName: professional.studioName,
      // Assinou na promoção e ainda não pagou o 1º mês: valor com desconto.
      amountCents: professional.promoPrimeiroMes
        ? precoPrimeiroMes(professional.planPriceCents)
        : professional.planPriceCents,
      backUrl: `${origem}/assinatura?volta=1`,
      // Em teste grátis, a 1ª cobrança só acontece quando o teste termina.
      startDate:
        professional.subscriptionStatus === "TRIAL" ? professional.trialEndsAt : null,
    });
    initPoint = r.initPoint;
  } catch (e) {
    console.error("[assinatura] criação falhou:", e);
    return { error: "Não foi possível iniciar a assinatura. Tente de novo em instantes." };
  }
  redirect(initPoint);
}
