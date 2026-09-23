/**
 * Callback do OAuth do Mercado Pago: valida o state assinado, troca o code
 * pelos tokens da profissional e guarda cifrado. Pública no proxy — a
 * autenticação real é o próprio state (HMAC + validade de 15min).
 */
import { redirect } from "next/navigation";
import { conectarConta, validarState } from "@/lib/mp-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";

  const professionalId = validarState(state);
  if (!professionalId || !code) {
    redirect("/config/pagamentos?erro=oauth");
  }

  try {
    await conectarConta(professionalId, code, `${url.origin}/api/mp/callback`);
  } catch (e) {
    console.error("[mp] conexão OAuth falhou:", e);
    redirect("/config/pagamentos?erro=oauth");
  }
  redirect("/config/pagamentos?ok=1");
}
