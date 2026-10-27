"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfessional } from "@/lib/session";
import { assinaturasDisponiveis, criarAssinatura } from "@/lib/mp-subscription";

export type AssinarState = { error?: string };

/** Cria a assinatura no MP e manda pro checkout de cartão hospedado. */
export async function assinarAction(): Promise<AssinarState> {
  const professional = await requireProfessional();
  if (!assinaturasDisponiveis()) {
    return { error: "Assinatura indisponível no momento — fale com o suporte." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";

  let initPoint: string;
  try {
    const r = await criarAssinatura({
      professionalId: professional.id,
      email: professional.email,
      studioName: professional.studioName,
      amountCents: professional.planPriceCents,
      backUrl: `${proto}://${host}/assinatura?volta=1`,
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
