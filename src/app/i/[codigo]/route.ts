/**
 * Link curto de indicação: lashos.com.br/i/CODIGO → cadastro com o código
 * já preenchido. Público (liberado no proxy).
 */
import { redirect } from "next/navigation";
import { normalizeSellerCode } from "@/lib/domain/plans";

export async function GET(_request: Request, ctx: RouteContext<"/i/[codigo]">) {
  const { codigo } = await ctx.params;
  const limpo = normalizeSellerCode(codigo);
  redirect(limpo ? `/comecar?v=${limpo}` : "/comecar");
}
