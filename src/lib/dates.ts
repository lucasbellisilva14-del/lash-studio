/**
 * Datas: armazenamento em UTC, exibição/entrada no fuso da profissional
 * (padrão America/Sao_Paulo). Formatos pt-BR: dd/MM/yyyy e HH:mm.
 */
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

export const DEFAULT_TZ = "America/Sao_Paulo";

export function formatDate(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "dd/MM/yyyy", { locale: ptBR });
}

export function formatTime(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "HH:mm", { locale: ptBR });
}

export function formatDateTime(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Ex.: "sábado, 30 de agosto" */
export function formatDateLong(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** Ex.: "sáb 30/08" */
export function formatDateShort(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "EEE dd/MM", { locale: ptBR });
}

export function formatWithPattern(date: Date, pattern: string, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, pattern, { locale: ptBR });
}

/** "yyyy-MM-dd" no fuso local (chave de dia p/ URLs e agrupamentos) */
export function localDayKey(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/** Início do dia local (como instante UTC) a partir de "yyyy-MM-dd" */
export function dayKeyToUtcStart(dayKey: string, tz = DEFAULT_TZ): Date {
  return fromZonedTime(`${dayKey}T00:00:00`, tz);
}

/** Intervalo UTC [início, fim) do dia local que contém `date` */
export function localDayRange(date: Date, tz = DEFAULT_TZ): { start: Date; end: Date } {
  const key = localDayKey(date, tz);
  const start = dayKeyToUtcStart(key, tz);
  return { start, end: addDays(start, 1) };
}

/** Combina "yyyy-MM-dd" + "HH:mm" locais em instante UTC */
export function localToUtc(dayKey: string, time: string, tz = DEFAULT_TZ): Date {
  return fromZonedTime(`${dayKey}T${time}:00`, tz);
}

/** Dia da semana local (0=domingo..6=sábado) */
export function localWeekday(date: Date, tz = DEFAULT_TZ): number {
  return toZonedTime(date, tz).getDay();
}

/** "HH:mm" local do instante */
export function localTimeOf(date: Date, tz = DEFAULT_TZ): string {
  return formatInTimeZone(date, tz, "HH:mm");
}

/** Diferença em dias de calendário no fuso local (b - a) */
export function diffLocalDays(a: Date, b: Date, tz = DEFAULT_TZ): number {
  return differenceInCalendarDays(
    startOfDay(toZonedTime(b, tz)),
    startOfDay(toZonedTime(a, tz)),
  );
}

/** Minutos desde 00:00 para "HH:mm" */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
