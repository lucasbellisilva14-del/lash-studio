/**
 * Logo pública do estúdio para o link de agendamento.
 * O /api/uploads exige login; visitantes do link público não têm sessão —
 * esta rota serve SOMENTE o arquivo apontado por professional.logoUrl,
 * validando que a chave pertence ao estúdio do slug.
 */
import { prisma } from "@/lib/prisma";
import { getStorageProvider, storageKeyOwner } from "@/lib/providers/storage";

const PREFIXO_UPLOADS = "/api/uploads/";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/agendar/[slug]/logo">,
) {
  const { slug } = await ctx.params;
  const estudio = await prisma.professional.findUnique({
    where: { slug },
    select: { id: true, logoUrl: true },
  });
  const logoUrl = estudio?.logoUrl;
  if (!estudio || !logoUrl?.startsWith(PREFIXO_UPLOADS)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const key = logoUrl.slice(PREFIXO_UPLOADS.length);
  if (storageKeyOwner(key) !== estudio.id) {
    return new Response("Não encontrado", { status: 404 });
  }

  const file = await getStorageProvider().get(key);
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
