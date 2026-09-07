/**
 * Diagnóstico de produção (protegido pelo CRON_SECRET):
 * presença das envs (booleans, nunca valores) + ping no banco.
 * GET /api/health?t=<CRON_SECRET>
 */
import { prisma } from "@/lib/prisma";
import { buildMessageQueue } from "@/lib/domain/queue";
import { getGamification } from "@/lib/domain/gamification";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.CRON_SECRET || url.searchParams.get("t") !== process.env.CRON_SECRET) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }

  // ?deep=1 — executa o trabalho pesado da home p/ reproduzir erros de runtime
  if (url.searchParams.get("deep") === "1") {
    const passos: Record<string, string> = {};
    const professional = await prisma.professional.findFirst();
    if (!professional) return Response.json({ erro: "sem professional" });
    for (const [nome, fn] of [
      ["fila", () => buildMessageQueue(professional.id)],
      ["gamificacao", () => getGamification(professional.id)],
    ] as const) {
      try {
        await fn();
        passos[nome] = "ok";
      } catch (e) {
        passos[nome] =
          e instanceof Error ? `${e.message}\n${(e.stack ?? "").slice(0, 600)}` : String(e);
      }
    }
    return Response.json({ passos });
  }

  // ?storage=1 — testa put/get/delete no provider de storage ativo
  if (url.searchParams.get("storage") === "1") {
    const { getStorageProvider } = await import("@/lib/providers/storage");
    const provider = getStorageProvider();
    const key = "diagnostico/ping.txt";
    try {
      await provider.put(key, Buffer.from("ping"), "text/plain");
      const back = await provider.get(key);
      await provider.delete(key);
      return Response.json({ provider: provider.name, put: "ok", get: back ? "ok" : "vazio" });
    } catch (e) {
      return Response.json({
        provider: provider.name,
        erro: e instanceof Error ? `${e.message}\n${(e.stack ?? "").slice(0, 400)}` : String(e),
      });
    }
  }

  const envs = Object.fromEntries(
    [
      "DATABASE_URL",
      "DIRECT_URL",
      "AUTH_SECRET",
      "AUTH_TRUST_HOST",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "CRON_SECRET",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ].map((k) => [k, Boolean(process.env[k])]),
  );

  let db = "ok";
  let professionals = -1;
  try {
    professionals = await prisma.professional.count();
  } catch (e) {
    db = e instanceof Error ? e.message.slice(0, 300) : "erro desconhecido";
  }

  return Response.json({ envs, db, professionals });
}
