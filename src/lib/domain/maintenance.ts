/**
 * Regra de ouro da manutenção: manutenção fora do prazo vira aplicação nova.
 */
import { diffLocalDays } from "@/lib/dates";

export type MaintenanceCheck =
  | { ok: true }
  | {
      ok: false;
      reason: "SEM_APLICACAO" | "FORA_DO_PRAZO";
      daysSinceLast: number | null;
      limitDays: number;
      message: string;
      /** Serviço de aplicação sugerido no lugar (id), se conhecido. */
      suggestedServiceId: string | null;
    };

/**
 * Verifica se uma manutenção pode ser agendada.
 * `lastLashAt` = último atendimento de cílios CONCLUÍDO (aplicação ou manutenção).
 */
export function checkMaintenanceWindow(params: {
  lastLashAt: Date | null;
  limitDays: number;
  /** Data do agendamento pretendido (a janela conta até o dia do atendimento). */
  targetDate: Date;
  suggestedServiceId: string | null;
  timezone?: string;
}): MaintenanceCheck {
  const { lastLashAt, limitDays, targetDate, suggestedServiceId, timezone } = params;

  if (!lastLashAt) {
    return {
      ok: false,
      reason: "SEM_APLICACAO",
      daysSinceLast: null,
      limitDays,
      suggestedServiceId,
      message:
        "Essa cliente não tem aplicação registrada. Manutenção só vale dentro do ciclo — sugerimos agendar uma aplicação nova.",
    };
  }

  const daysSinceLast = diffLocalDays(lastLashAt, targetDate, timezone);
  if (daysSinceLast > limitDays) {
    return {
      ok: false,
      reason: "FORA_DO_PRAZO",
      daysSinceLast,
      limitDays,
      suggestedServiceId,
      message: `Já se passaram ${daysSinceLast} dias desde o último atendimento — acima do prazo de ${limitDays} dias. O correto é uma aplicação nova (preço cheio).`,
    };
  }

  return { ok: true };
}
