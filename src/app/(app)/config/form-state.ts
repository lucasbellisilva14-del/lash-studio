import type { ZodError } from "zod";

/** Estado compartilhado dos formulários de configuração (useActionState). */
export type ConfigFormState = {
  ok: boolean;
  /** Erro geral do formulário (exibido no topo). */
  error?: string;
  /** Erros por campo (chave = name do input). */
  fieldErrors?: Record<string, string>;
  /** Timestamp do último salvamento — dispara o toast "Salvo!". */
  savedAt?: number;
};

export const initialConfigFormState: ConfigFormState = { ok: false };

/** Converte issues do zod em { campo: mensagem } (primeira mensagem vence). */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
