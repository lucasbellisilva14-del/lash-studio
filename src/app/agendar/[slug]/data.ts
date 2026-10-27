import "server-only";

/**
 * Consultas e utilitários do link público de agendamento.
 * Rota pública: NUNCA expor dados de outras clientes — só o que o
 * estúdio mostra de si (nome, serviços, horários livres).
 */
import crypto from "node:crypto";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { BLOCKING_STATUSES, WEEKDAYS_PT_SHORT } from "@/lib/constants";
import { dayKeyToUtcStart, formatWithPattern, localWeekday } from "@/lib/dates";
import { firstName, initials, type TeamPro } from "@/lib/team-shared";
import type {
  BlockRule,
  ExistingAppointment,
  WorkingHourRule,
} from "@/lib/domain/scheduling";
import type { AgendarDia, AgendarProfissional } from "@/components/agendar/types";

/** Estúdio dono do link. slug é único — retorna null se não existir. */
export async function getEstudioPorSlug(slug: string) {
  if (!slug) return null;
  return prisma.professional.findUnique({ where: { slug } });
}

export type BloqueioPublico = BlockRule & { memberId: string | null; allTeam: boolean };

/**
 * Horários de funcionamento + TODOS os bloqueios do estúdio (cada um diz a
 * quem vale — separe por profissional com bloqueiosDe).
 */
export async function getGradePublica(professionalId: string): Promise<{
  workingHours: WorkingHourRule[];
  blocks: BloqueioPublico[];
}> {
  const [workingHours, blocks] = await Promise.all([
    prisma.workingHour.findMany({ where: { professionalId } }),
    prisma.scheduleBlock.findMany({ where: { professionalId } }),
  ]);
  return { workingHours, blocks };
}

/**
 * Agendamentos que ocupam horário num dia local, de todas as profissionais
 * (cada um com o memberId de quem atende; separe com ocupacoesDe).
 * Sem nome de cliente: o retorno alimenta mensagens que podem chegar ao público.
 */
export async function getOcupacoesPublicasDoDia(
  professionalId: string,
  dayKey: string,
  tz: string,
): Promise<Array<ExistingAppointment & { memberId: string | null }>> {
  const start = dayKeyToUtcStart(dayKey, tz);
  const end = addDays(start, 1);
  return prisma.appointment.findMany({
    where: {
      professionalId,
      startAt: { gte: start, lt: end },
      status: { in: [...BLOCKING_STATUSES] },
    },
    select: { id: true, startAt: true, endAt: true, memberId: true },
  });
}

/** Agendamentos de UMA profissional (memberId nulo = a dona). */
export function ocupacoesDe<T extends { memberId: string | null }>(
  ocupacoes: T[],
  memberId: string | null,
): T[] {
  return ocupacoes.filter((o) => o.memberId === memberId);
}

/**
 * Bloqueios que valem para uma profissional: os do estúdio inteiro + os dela.
 * Mesmo critério de blockScopeFor (@/lib/team), aplicado em memória para
 * calcular várias profissionais com uma consulta só.
 */
export function bloqueiosDe(blocks: BloqueioPublico[], memberId: string | null): BloqueioPublico[] {
  return blocks.filter((b) => b.allTeam || (!b.allTeam && b.memberId === memberId));
}

/**
 * Quem atende pelo link: com equipe, só quem está marcada para o agendamento
 * online (bookableOnline); sem equipe, a dona — o link funciona como sempre.
 */
export function profissionaisDoLink(team: TeamPro[]): TeamPro[] {
  return team.length > 1 ? team.filter((p) => p.bookableOnline) : team;
}

/** O que a página pública mostra de cada profissional: primeiro nome, iniciais e cor. */
export function toAgendarProfissional(p: TeamPro): AgendarProfissional {
  return { key: p.key, nome: firstName(p.name), iniciais: initials(p.name), cor: p.color };
}

/** Próximos 14 dias, pulando os sem expediente configurado. */
export function montarDiasDisponiveis(
  workingHours: WorkingHourRule[],
  tz: string,
  agora = new Date(),
): AgendarDia[] {
  const diasAtivos = new Set(
    workingHours.filter((w) => w.active).map((w) => w.weekday),
  );
  const dias: AgendarDia[] = [];
  for (let i = 0; i < 14; i++) {
    const data = addDays(agora, i);
    const weekday = localWeekday(data, tz);
    if (!diasAtivos.has(weekday)) continue;
    dias.push({
      dia: formatWithPattern(data, "yyyy-MM-dd", tz),
      rotulo: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : WEEKDAYS_PT_SHORT[weekday],
      dataCurta: formatWithPattern(data, "dd/MM", tz),
    });
  }
  return dias;
}

/* ------------------------------------------------------------------ */
/* Anti-spam: timestamp assinado no carregamento do formulário         */
/* ------------------------------------------------------------------ */

const SEGREDO = process.env.AUTH_SECRET ?? "lashos-agendar-dev";
/** Envio só é aceito depois de 3s na página (bot preenche instantâneo). */
const IDADE_MINIMA_MS = 3_000;
/** Token expira em 24h — quem deixou a aba aberta demais só recarrega. */
const IDADE_MAXIMA_MS = 24 * 3_600_000;

export function assinarTimestamp(slug: string, ts: number): string {
  return crypto
    .createHmac("sha256", SEGREDO)
    .update(`${slug}.${ts}`)
    .digest("hex")
    .slice(0, 32);
}

export function timestampValido(
  slug: string,
  ts: number,
  assinatura: string,
  agora = Date.now(),
): boolean {
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const esperado = Buffer.from(assinarTimestamp(slug, ts));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length) return false;
  if (!crypto.timingSafeEqual(esperado, recebido)) return false;
  const idade = agora - ts;
  return idade >= IDADE_MINIMA_MS && idade <= IDADE_MAXIMA_MS;
}
