/**
 * Fotos da vitrine pública: serve SOMENTE fotos que a profissional marcou
 * como vitrine (showcaseAt) e que pertencem ao estúdio do slug.
 * ?t=1 devolve a miniatura.
 */
import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/providers/storage";

export async function GET(
  request: Request,
  ctx: RouteContext<"/agendar/[slug]/foto/[fotoId]">,
) {
  const { slug, fotoId } = await ctx.params;
  const thumb = new URL(request.url).searchParams.get("t") === "1";

  const foto = await prisma.photo.findFirst({
    where: {
      id: fotoId,
      showcaseAt: { not: null },
      professional: { slug },
    },
    select: { storageKey: true, thumbKey: true },
  });
  if (!foto) return new Response("Não encontrado", { status: 404 });

  const key = thumb ? foto.thumbKey ?? foto.storageKey : foto.storageKey;
  const file = await getStorageProvider().get(key);
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
