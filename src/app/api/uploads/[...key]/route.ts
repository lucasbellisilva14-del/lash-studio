/**
 * Serve arquivos do StorageProvider com checagem de dono (LGPD):
 * a chave começa com o professionalId — só a dona da conta acessa.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, storageKeyOwner } from "@/lib/providers/storage";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/uploads/[...key]">,
) {
  const session = await auth();
  const professionalId = session?.user?.id;
  if (!professionalId) {
    return new Response("Não autorizado", { status: 401 });
  }
  // Funcionária desativada perde o acesso também aos arquivos do estúdio.
  const memberId = (session.user as { memberId?: string | null }).memberId;
  if (memberId) {
    const ativa = await prisma.teamMember.count({ where: { id: memberId, professionalId, active: true } });
    if (!ativa) return new Response("Não autorizado", { status: 403 });
  }

  const { key } = await ctx.params;
  const storageKey = key.join("/");

  if (storageKeyOwner(storageKey) !== professionalId) {
    return new Response("Não autorizado", { status: 403 });
  }

  const file = await getStorageProvider().get(storageKey);
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
