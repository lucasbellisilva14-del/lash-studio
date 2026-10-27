/**
 * Financeiro — chaves de mês "yyyy-MM" no fuso da profissional.
 * Puro (sem banco): serve à página, às contas e aos testes.
 */
import { dayKeyToUtcStart, formatWithPattern } from "@/lib/dates";

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

/** "yyyy-MM" do instante no fuso da profissional. */
export function monthKeyOf(date: Date, tz: string): string {
  return formatWithPattern(date, "yyyy-MM", tz);
}

/** Desloca uma chave "yyyy-MM" em `delta` meses. */
export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Intervalo UTC [início, fim) do mês local "yyyy-MM". */
export function monthRange(key: string, tz: string): { start: Date; end: Date } {
  return {
    start: dayKeyToUtcStart(`${key}-01`, tz),
    end: dayKeyToUtcStart(`${shiftMonthKey(key, 1)}-01`, tz),
  };
}

/** Quantos dias tem o mês "yyyy-MM". */
export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "Outubro de 2026" */
export function monthLabel(key: string, tz: string): string {
  const text = formatWithPattern(monthRange(key, tz).start, "MMMM 'de' yyyy", tz);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "out" (eixo do gráfico) */
export function monthShortLabel(key: string, tz: string): string {
  return formatWithPattern(monthRange(key, tz).start, "MMM", tz).replace(".", "");
}
