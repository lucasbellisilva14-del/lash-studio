/**
 * Encerra a sessão por GET — usado quando a funcionária foi desativada e a
 * sessão dela ainda existe (requireViewer manda para cá). Pedido vindo de
 * outro site não desloga ninguém.
 */
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";

export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") redirect("/");
  const motivo = new URL(request.url).searchParams.get("motivo");
  await signOut({ redirectTo: motivo === "acesso" ? "/login?acesso=encerrado" : "/login" });
}
