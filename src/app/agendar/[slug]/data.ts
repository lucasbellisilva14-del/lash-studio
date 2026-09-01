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
import type {
  BlockRule,
  ExistingAppointment,
  WorkingHourRule,
} from "@/lib/domain/scheduling";
import type { AgendarDia } from "@/components/agendar/types";

/** Estúdio dono do link. slug é único — retorna null se não existir. */
export async function getEstudioPorSlug(slug: string) {
  if (!slug) return null;
  return prisma.professional.findUnique({ where: { slug } });
}

/** Horários de funcionamento + bloqueios, no formato das funções de domínio. */
export async function getGradePublica(professionalId: string): Promise<{
  workingHours: WorkingHourRule[];
  blocks: BlockRule[];
}> {
  const [workingHours, blocks] = await Promise.all([
    prisma.workingHour.findMany({ where: { professionalId } }),
    prisma.scheduleBlock.findMany({ where: { professionalId } }),
  ]);
  return { workingHours, blocks };
}

/**
 * Agendamentos que ocupam horário num dia local (p/ freeSlotsForDay/validateSlot).
 * Sem nome de cliente: o retorno alimenta mensagens que podem chegar ao público.
 */
export async function getOcupacoesPublicasDoDia(
  professionalId: string,
  dayKey: string,
  tz: string,
): Promise<ExistingAppointment[]> {
  const start = dayKeyToUtcStart(dayKey, tz);
  const end = addDays(start, 1);
  return prisma.appointment.findMany({
    where: {
      professionalId,
      startAt: { gte: start, lt: end },
      status: { in: [...BLOCKING_STATUSES] },
    },
    select: { id: true, startAt: true, endAt: true },
  });
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
