/**
 * "Conectar Mercado Pago": manda a profissional logada pro consentimento
 * OAuth do MP, com state assinado (anti-CSRF).
 */
import { redirect } from "next/navigation";
import { requireProfessionalId } from "@/lib/session";
import { gerarState, mpOauthDisponivel, urlAutorizacao } from "@/lib/mp-oauth";

export async function GET(request: Request) {
  const professionalId = await requireProfessionalId();
  if (!mpOauthDisponivel()) {
    redirect("/config/pagamentos?erro=indisponivel");
  }

  const origem = new URL(request.url).origin;
  const redirectUri = `${origem}/api/mp/callback`;
  redirect(urlAutorizacao(gerarState(professionalId), redirectUri));
}
