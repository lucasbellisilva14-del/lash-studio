/**
 * Diagnóstico de produção (protegido pelo CRON_SECRET):
 * presença das envs (booleans, nunca valores) + ping no banco.
 * GET /api/health?t=<CRON_SECRET>
 */
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.CRON_SECRET || url.searchParams.get("t") !== process.env.CRON_SECRET) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
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
