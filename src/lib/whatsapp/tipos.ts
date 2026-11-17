/**
 * Regras do envio automático que valem no server e no client (puro):
 * quais tipos podem sair sozinhos, em que horário e o limite diário.
 */
import type { TemplateKind } from "@/lib/constants";

/**
 * Tipos que podem sair sozinhos, na ordem de prioridade. O resgate de 45 dias é
 * opcional e nasce desligado; aniversário e resgate de 60/90 dias nunca saem
 * sozinhos (cliente parada há muito tempo é quem mais denuncia mensagem).
 */
export const TIPOS_AUTOMATICOS = [
  "CONFIRMACAO",
  "LEMBRETE_24H",
  "POS_APLICACAO",
  "REMARCAR",
  "MANUTENCAO",
  "RETORNO",
  "RESGATE_45",
] as const satisfies readonly TemplateKind[];

export type TipoAutomatico = (typeof TIPOS_AUTOMATICOS)[number];

export const TIPOS_AUTOMATICOS_INFO: Record<TipoAutomatico, { label: string; dica: string }> = {
  CONFIRMACAO: { label: "Confirmação", dica: "Logo depois de marcar, com o Pix do sinal" },
  LEMBRETE_24H: { label: "Lembrete 24h antes", dica: "Na véspera do horário" },
  POS_APLICACAO: { label: "Cuidados pós-aplicação", dica: "No dia do atendimento" },
  REMARCAR: { label: "Remarcar", dica: "Para quem faltou ou cancelou" },
  MANUTENCAO: { label: "Manutenção", dica: "Quando chega a hora da manutenção" },
  RETORNO: { label: "Retorno", dica: "Quando chega a hora de voltar" },
  RESGATE_45: { label: "Chamar de volta (45 dias)", dica: "Para quem está há 45 dias sem vir" },
};

/** Ligados para quem ainda não escolheu: tudo, menos o resgate (ela marca se quiser). */
export const TIPOS_PADRAO: readonly TipoAutomatico[] = TIPOS_AUTOMATICOS.filter((t) => t !== "RESGATE_45");

export const LIMITES_DIARIOS = [30, 60, 100] as const;

export function ehTipoAutomatico(kind: string): kind is TipoAutomatico {
  return (TIPOS_AUTOMATICOS as readonly string[]).includes(kind);
}

/** Tipos ligados pela dona (CSV salvo na conexão). */
export function tiposLigados(autoKinds: string): Set<TipoAutomatico> {
  return new Set(autoKinds.split(",").map((k) => k.trim()).filter(ehTipoAutomatico));
}

/** Janela de envio em minutos do dia (hora local do estúdio). */
export function janelaDeEnvio(kind: TemplateKind): [number, number] {
  return kind === "CONFIRMACAO" ? [7 * 60 + 30, 22 * 60] : [8 * 60 + 30, 20 * 60];
}

export function dentroDaJanela(kind: TemplateKind, minutos: number): boolean {
  const [ini, fim] = janelaDeEnvio(kind);
  return minutos >= ini && minutos < fim;
}
