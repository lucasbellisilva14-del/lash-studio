/**
 * Validação de horários da agenda: conflito, buffer, horário de funcionamento,
 * antecedência mínima e bloqueios. Funções puras — recebem dados, não consultam o banco.
 */
import { localDayKey, localTimeOf, localToUtc, localWeekday, timeToMinutes } from "@/lib/dates";

export type SlotViolation =
  | { code: "ANTECEDENCIA"; message: string }
  | { code: "FORA_DO_HORARIO"; message: string }
  | { code: "BLOQUEIO"; message: string }
  | { code: "CONFLITO"; message: string }
  | { code: "BUFFER"; message: string };

export type ExistingAppointment = {
  id: string;
  startAt: Date;
  endAt: Date;
  clientName?: string;
};

export type WorkingHourRule = {
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type BlockRule = {
  title: string;
  type: string; // AVULSO | SEMANAL
  startAt: Date | null;
  endAt: Date | null;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
};

export type SlotInput = {
  startAt: Date;
  durationMin: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  timezone: string;
  workingHours: WorkingHourRule[];
  blocks: BlockRule[];
  /** Agendamentos ativos do dia (status que ocupam horário). */
  appointments: ExistingAppointment[];
  /** Reagendamento: ignora o próprio agendamento. */
  ignoreAppointmentId?: string;
  /** Pula validação de antecedência (uso interno da profissional). */
  skipAdvanceCheck?: boolean;
  now?: Date;
};

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function validateSlot(input: SlotInput): SlotViolation[] {
  const violations: SlotViolation[] = [];
  const now = input.now ?? new Date();
  const tz = input.timezone;
  const endAt = new Date(input.startAt.getTime() + input.durationMin * 60_000);

  // 1. Antecedência mínima
  if (!input.skipAdvanceCheck && input.minAdvanceHours > 0) {
    const minStart = new Date(now.getTime() + input.minAdvanceHours * 3_600_000);
    if (input.startAt < minStart) {
      violations.push({
        code: "ANTECEDENCIA",
        message: `Agendamentos precisam de pelo menos ${input.minAdvanceHours}h de antecedência.`,
      });
    }
  }

  // 2. Horário de funcionamento (no fuso local)
  const weekday = localWeekday(input.startAt, tz);
  const rule = input.workingHours.find((w) => w.weekday === weekday && w.active);
  if (!rule) {
    violations.push({
      code: "FORA_DO_HORARIO",
      message: "O estúdio não atende nesse dia da semana.",
    });
  } else {
    const startMin = timeToMinutes(localTimeOf(input.startAt, tz));
    const endMin = startMin + input.durationMin;
    if (startMin < timeToMinutes(rule.startTime) || endMin > timeToMinutes(rule.endTime)) {
      violations.push({
        code: "FORA_DO_HORARIO",
        message: `Fora do horário de funcionamento (${rule.startTime}–${rule.endTime}).`,
      });
    }
  }

  // 3. Bloqueios
  for (const block of input.blocks) {
    if (block.type === "AVULSO" && block.startAt && block.endAt) {
      if (overlaps(input.startAt, endAt, block.startAt, block.endAt)) {
        violations.push({
          code: "BLOQUEIO",
          message: `Conflito com bloqueio: ${block.title}.`,
        });
      }
    } else if (
      block.type === "SEMANAL" &&
      block.weekday === weekday &&
      block.startTime &&
      block.endTime
    ) {
      const dayKey = localDayKey(input.startAt, tz);
      const blockStart = localToUtc(dayKey, block.startTime, tz);
      const blockEnd = localToUtc(dayKey, block.endTime, tz);
      if (overlaps(input.startAt, endAt, blockStart, blockEnd)) {
        violations.push({
          code: "BLOQUEIO",
          message: `Conflito com bloqueio: ${block.title}.`,
        });
      }
    }
  }

  // 4. Conflito direto e 5. buffer
  for (const appt of input.appointments) {
    if (input.ignoreAppointmentId && appt.id === input.ignoreAppointmentId) continue;
    const who = appt.clientName ? ` com ${appt.clientName}` : "";
    if (overlaps(input.startAt, endAt, appt.startAt, appt.endAt)) {
      violations.push({
        code: "CONFLITO",
        message: `Conflito com atendimento${who}.`,
      });
      continue;
    }
    const bufferMs = input.bufferMinutes * 60_000;
    const bufferedStart = new Date(appt.startAt.getTime() - bufferMs);
    const bufferedEnd = new Date(appt.endAt.getTime() + bufferMs);
    if (overlaps(input.startAt, endAt, bufferedStart, bufferedEnd)) {
      violations.push({
        code: "BUFFER",
        message: `Respeite o intervalo de ${input.bufferMinutes} min entre atendimentos${who}.`,
      });
    }
  }

  return violations;
}

/**
 * Horários livres de um dia (para sugestão na criação e link público).
 * Retorna inícios possíveis "HH:mm" locais, a cada `stepMin` minutos.
 */
export function freeSlotsForDay(params: {
  dayKey: string;
  durationMin: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  timezone: string;
  workingHours: WorkingHourRule[];
  blocks: BlockRule[];
  appointments: ExistingAppointment[];
  stepMin?: number;
  now?: Date;
}): string[] {
  const step = params.stepMin ?? 30;
  const tz = params.timezone;
  const dayStart = localToUtc(params.dayKey, "00:00", tz);
  const weekday = localWeekday(dayStart, tz);
  const rule = params.workingHours.find((w) => w.weekday === weekday && w.active);
  if (!rule) return [];

  const slots: string[] = [];
  const startMin = timeToMinutes(rule.startTime);
  const endMin = timeToMinutes(rule.endTime);
  for (let m = startMin; m + params.durationMin <= endMin; m += step) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const time = `${h}:${mm}`;
    const startAt = localToUtc(params.dayKey, time, tz);
    const violations = validateSlot({
      startAt,
      durationMin: params.durationMin,
      bufferMinutes: params.bufferMinutes,
      minAdvanceHours: params.minAdvanceHours,
      timezone: tz,
      workingHours: params.workingHours,
      blocks: params.blocks,
      appointments: params.appointments,
      now: params.now,
    });
    if (violations.length === 0) slots.push(time);
  }
  return slots;
}
