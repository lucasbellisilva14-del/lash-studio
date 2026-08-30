/** Renderização de templates de mensagem com variáveis {{...}}. */
import { formatBRL } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/dates";

export type TemplateContext = {
  clientName?: string;
  startAt?: Date | null;
  serviceName?: string;
  priceCents?: number | null;
  depositCents?: number | null;
  addressLine?: string | null;
  mapsUrl?: string | null;
  pixKey?: string | null;
  studioName?: string;
  timezone?: string;
};

/** Primeiro nome, capitalizado. */
export function firstName(full: string): string {
  const name = full.trim().split(/\s+/)[0] ?? "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function renderTemplate(body: string, ctx: TemplateContext): string {
  const tz = ctx.timezone;
  const vars: Record<string, string> = {
    nome: ctx.clientName ? firstName(ctx.clientName) : "",
    data: ctx.startAt ? formatDate(ctx.startAt, tz) : "",
    hora: ctx.startAt ? formatTime(ctx.startAt, tz) : "",
    servico: ctx.serviceName ?? "",
    valor: ctx.priceCents != null ? formatBRL(ctx.priceCents) : "",
    valor_sinal: ctx.depositCents != null ? formatBRL(ctx.depositCents) : "",
    endereco: [ctx.addressLine, ctx.mapsUrl].filter(Boolean).join(" — "),
    pix: ctx.pixKey ?? "",
    nome_estudio: ctx.studioName ?? "",
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

export const TEMPLATE_VARIABLES = [
  { variable: "{{nome}}", description: "Primeiro nome da cliente" },
  { variable: "{{data}}", description: "Data do agendamento (dd/mm/aaaa)" },
  { variable: "{{hora}}", description: "Hora do agendamento" },
  { variable: "{{servico}}", description: "Nome do serviço" },
  { variable: "{{valor}}", description: "Valor do serviço" },
  { variable: "{{valor_sinal}}", description: "Valor do sinal" },
  { variable: "{{endereco}}", description: "Endereço do estúdio (com link do Maps)" },
  { variable: "{{pix}}", description: "Chave Pix" },
  { variable: "{{nome_estudio}}", description: "Nome do estúdio" },
] as const;
