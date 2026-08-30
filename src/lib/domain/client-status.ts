import type { ClientStatus } from "@/lib/constants";
import { diffLocalDays } from "@/lib/dates";

export type ClientCycleInfo = {
  status: ClientStatus;
  /** Último atendimento de cílios concluído (aplicação ou manutenção). */
  lastLashAt: Date | null;
  daysSinceLast: number | null;
  /** Data-limite p/ manutenção (lastLashAt + maintenanceLimitDays). */
  maintenanceDueAt: Date | null;
  daysUntilDue: number | null;
};

type Settings = {
  maintenanceLimitDays: number;
  inactiveDays: number;
  timezone?: string;
};

/**
 * Status automático pelo ciclo:
 * - ATIVA: dentro do prazo de manutenção
 * - EM_RISCO: passou do prazo (até o limite de inatividade)
 * - INATIVA: mais de `inactiveDays` sem atendimento
 * - SEM_HISTORICO: nunca concluiu atendimento de cílios
 */
export function computeClientCycle(
  lastLashAt: Date | null,
  settings: Settings,
  now = new Date(),
): ClientCycleInfo {
  if (!lastLashAt) {
    return {
      status: "SEM_HISTORICO",
      lastLashAt: null,
      daysSinceLast: null,
      maintenanceDueAt: null,
      daysUntilDue: null,
    };
  }
  const tz = settings.timezone;
  const daysSinceLast = diffLocalDays(lastLashAt, now, tz);
  const maintenanceDueAt = new Date(
    lastLashAt.getTime() + settings.maintenanceLimitDays * 24 * 60 * 60 * 1000,
  );
  const daysUntilDue = settings.maintenanceLimitDays - daysSinceLast;

  let status: ClientStatus;
  if (daysSinceLast > settings.inactiveDays) status = "INATIVA";
  else if (daysSinceLast > settings.maintenanceLimitDays) status = "EM_RISCO";
  else status = "ATIVA";

  return { status, lastLashAt, daysSinceLast, maintenanceDueAt, daysUntilDue };
}
