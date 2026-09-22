import "server-only";

/** Números da semana (últimos 7 dias) — compartilhados pela página e pela imagem. */
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatWithPattern, localDayKey } from "@/lib/dates";

export type ResumoSemana = {
  atendimentos: number;
  faturamentoCents: number;
  novasClientes: number;
  fotos: number;
  /** ex.: "sábado" — dia com mais receita; null sem receita. */
  melhorDia: string | null;
  periodo: { de: string; ate: string }; // dd/MM
};

export async function getResumoSemana(
  professionalId: string,
  tz: string,
  now = new Date(),
): Promise<ResumoSemana> {
  const inicio = subDays(now, 7);

  const [atendimentos, receitas, novasClientes, fotos] = await Promise.all([
    prisma.appointment.count({
      where: { professionalId, status: "CONCLUIDO", startAt: { gte: inicio, lte: now } },
    }),
    prisma.transaction.findMany({
      where: { professionalId, type: "RECEITA", date: { gte: inicio, lte: now } },
      select: { netCents: true, date: true },
    }),
    prisma.client.count({
      where: { professionalId, createdAt: { gte: inicio, lte: now } },
    }),
    prisma.photo.count({
      where: { professionalId, createdAt: { gte: inicio, lte: now } },
    }),
  ]);

  const porDia = new Map<string, number>();
  let faturamentoCents = 0;
  for (const t of receitas) {
    faturamentoCents += t.netCents;
    const k = localDayKey(t.date, tz);
    porDia.set(k, (porDia.get(k) ?? 0) + t.netCents);
  }
  let melhorDia: string | null = null;
  let melhorValor = 0;
  for (const [k, v] of porDia) {
    if (v > melhorValor) {
      melhorValor = v;
      melhorDia = formatWithPattern(new Date(`${k}T12:00:00Z`), "EEEE", tz);
    }
  }

  return {
    atendimentos,
    faturamentoCents,
    novasClientes,
    fotos,
    melhorDia,
    periodo: {
      de: formatWithPattern(inicio, "dd/MM", tz),
      ate: formatWithPattern(now, "dd/MM", tz),
    },
  };
}
