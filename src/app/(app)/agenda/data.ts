import "server-only";

/**
 * Consultas compartilhadas do módulo Agenda (página + server actions).
 * Equipe: conflito, buffer e bloqueios valem POR PROFISSIONAL (memberId nulo
 * = a dona); o horário de funcionamento é o do estúdio.
 */
import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BLOCKING_STATUSES } from "@/lib/constants";
import { dayKeyToUtcStart } from "@/lib/dates";
import { blockScopeFor } from "@/lib/team";
import { OWNER_COLOR, OWNER_KEY } from "@/lib/team-shared";
import type {
  BlockRule,
  ExistingAppointment,
  WorkingHourRule,
} from "@/lib/domain/scheduling";
import type {
  AgendaBloqueio,
  AgendaCliente,
  AgendaCompromisso,
  AgendaServico,
  HorarioFuncionamento,
} from "@/components/agenda/types";

export type BloqueioRow = BlockRule & {
  id: string;
  memberId: string | null;
  allTeam: boolean;
};

/**
 * Horários de funcionamento + bloqueios, no formato das funções de domínio.
 * `{ memberId }`: só os bloqueios que valem para essa profissional (os dela +
 * os do estúdio inteiro). `"todas"`: todos os bloqueios do estúdio.
 */
export async function getGradeAgenda(
  professionalId: string,
  para: { memberId: string | null } | "todas",
): Promise<{ workingHours: WorkingHourRule[]; blocks: BloqueioRow[] }> {
  const [workingHours, blocks] = await Promise.all([
    prisma.workingHour.findMany({ where: { professionalId } }),
    prisma.scheduleBlock.findMany({
      where:
        para === "todas"
          ? { professionalId }
          : { professionalId, AND: [blockScopeFor(para.memberId)] },
    }),
  ]);
  return { workingHours, blocks };
}

/**
 * Agendamentos que ocupam horário num dia local, de UMA profissional
 * (memberId nulo = a dona), para validateSlot/freeSlotsForDay.
 */
export async function getOcupacoesDoDia(
  professionalId: string,
  dayKey: string,
  tz: string,
  memberId: string | null,
): Promise<ExistingAppointment[]> {
  const start = dayKeyToUtcStart(dayKey, tz);
  const end = addDays(start, 1);
  const appts = await prisma.appointment.findMany({
    where: {
      professionalId,
      memberId,
      startAt: { gte: start, lt: end },
      status: { in: [...BLOCKING_STATUSES] },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      client: { select: { name: true } },
    },
  });
  return appts.map((a) => ({
    id: a.id,
    startAt: a.startAt,
    endAt: a.endAt,
    clientName: a.client.name,
  }));
}

export function parseFlags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  noShowCount: number;
  anamnesisForm: { hasContraindication: boolean; contraindicationFlags: string } | null;
};

export const CLIENTE_AGENDA_SELECT = {
  id: true,
  name: true,
  phone: true,
  noShowCount: true,
  anamnesisForm: {
    select: { hasContraindication: true, contraindicationFlags: true },
  },
} satisfies Prisma.ClientSelect;

export function toAgendaCliente(c: ClientRow): AgendaCliente {
  return {
    id: c.id,
    nome: c.name,
    telefone: c.phone,
    faltas: c.noShowCount,
    temContraindicacao: c.anamnesisForm?.hasContraindication ?? false,
    flags: parseFlags(c.anamnesisForm?.contraindicationFlags),
  };
}

/** Clientes para o agendamento, dentro do escopo de quem está logada (clientScope). */
export async function getClientesAgenda(
  professionalId: string,
  escopo: Prisma.ClientWhereInput,
): Promise<AgendaCliente[]> {
  const clients = await prisma.client.findMany({
    where: { professionalId, AND: [escopo] },
    orderBy: { name: "asc" },
    select: CLIENTE_AGENDA_SELECT,
  });
  return clients.map(toAgendaCliente);
}

export async function getServicosAtivos(professionalId: string): Promise<AgendaServico[]> {
  const services = await prisma.service.findMany({
    where: { professionalId, active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return services.map((s) => ({
    id: s.id,
    nome: s.name,
    categoria: s.category as AgendaServico["categoria"],
    duracaoMin: s.durationMin,
    precoCents: s.priceCents,
    exigeSinal: s.requiresDeposit,
    manutencaoDeId: s.maintenanceOfId,
  }));
}

/**
 * Compromissos exibíveis (tudo menos cancelados) num intervalo UTC [start, end),
 * dentro do escopo (filtro de profissional ou appointmentScope da funcionária).
 * `donaNome` identifica os agendamentos da dona (memberId nulo).
 */
export async function getCompromissosNoIntervalo(
  professionalId: string,
  start: Date,
  end: Date,
  escopo: Prisma.AppointmentWhereInput,
  donaNome: string,
): Promise<AgendaCompromisso[]> {
  const appts = await prisma.appointment.findMany({
    where: {
      professionalId,
      AND: [escopo],
      startAt: { gte: start, lt: end },
      status: { notIn: ["CANCELADO", "CANCELADO_TARDE"] },
    },
    orderBy: { startAt: "asc" },
    include: {
      client: { select: CLIENTE_AGENDA_SELECT },
      service: { select: { id: true, name: true, category: true } },
      member: { select: { id: true, name: true, color: true } },
    },
  });
  return appts.map((a) => ({
    id: a.id,
    inicio: a.startAt.toISOString(),
    fim: a.endAt.toISOString(),
    status: a.status as AgendaCompromisso["status"],
    precoCents: a.priceCents,
    sinalExigido: a.depositRequired,
    sinalCents: a.depositCents,
    sinalPagoEm: a.depositPaidAt?.toISOString() ?? null,
    observacoes: a.notes,
    cliente: toAgendaCliente(a.client),
    servico: {
      id: a.service.id,
      nome: a.service.name,
      categoria: a.service.category as AgendaCompromisso["servico"]["categoria"],
    },
    profissional: a.member
      ? { key: a.member.id, memberId: a.member.id, nome: a.member.name, cor: a.member.color }
      : { key: OWNER_KEY, memberId: null, nome: donaNome, cor: OWNER_COLOR },
  }));
}

export function toAgendaBloqueio(
  b: {
    id: string;
    title: string;
    type: string;
    startAt: Date | null;
    endAt: Date | null;
    weekday: number | null;
    startTime: string | null;
    endTime: string | null;
    allTeam: boolean;
  },
  para: string | null = null,
): AgendaBloqueio {
  return {
    id: b.id,
    titulo: b.title,
    tipo: b.type,
    inicio: b.startAt?.toISOString() ?? null,
    fim: b.endAt?.toISOString() ?? null,
    diaSemana: b.weekday,
    horaInicio: b.startTime,
    horaFim: b.endTime,
    estudioInteiro: b.allTeam,
    para,
  };
}

export function toHorarioFuncionamento(w: WorkingHourRule): HorarioFuncionamento {
  return {
    diaSemana: w.weekday,
    horaInicio: w.startTime,
    horaFim: w.endTime,
    ativo: w.active,
  };
}
