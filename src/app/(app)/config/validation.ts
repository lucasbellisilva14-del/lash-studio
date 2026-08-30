import { z } from "zod";

/** Helpers de validação (server-side) do módulo de configurações. */

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Campo inteiro vindo de FormData (string) com faixa e mensagem pt-BR. */
export function intField(min: number, max: number, message: string) {
  return z
    .string()
    .default("")
    .transform((s) => Number(s.trim().replace(",", ".")))
    .refine((n) => Number.isInteger(n) && n >= min && n <= max, message);
}

/** Campo percentual (aceita vírgula decimal), 0 a 100. */
export function pctField(message: string) {
  return z
    .string()
    .default("")
    .transform((s) => Number(s.trim().replace("%", "").replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100, message)
    .transform((n) => Math.round(n * 100) / 100);
}
