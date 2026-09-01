/** Tipos do link público de agendamento (client-safe — sem imports de servidor). */
import type { ServiceCategory } from "@/lib/constants";

export type AgendarServico = {
  id: string;
  nome: string;
  categoria: ServiceCategory;
  duracaoMin: number;
  precoCents: number;
  exigeSinal: boolean;
};

/** Chip de dia disponível (próximos 14 dias com expediente). */
export type AgendarDia = {
  /** "yyyy-MM-dd" no fuso do estúdio */
  dia: string;
  /** "Hoje" | "Amanhã" | "seg"... */
  rotulo: string;
  /** "01/09" */
  dataCurta: string;
};

export type AgendarEstudio = {
  slug: string;
  nome: string;
  /** WhatsApp do estúdio, só dígitos (ou null) */
  whatsapp: string | null;
  minAdvanceHours: number;
};

/** Timestamp assinado no carregamento da página (anti-spam). */
export type TokenFormulario = {
  ts: number;
  assinatura: string;
};

export type SolicitacaoSucesso = {
  servico: string;
  /** dd/MM/yyyy */
  data: string;
  /** HH:mm */
  hora: string;
  valorCents: number;
  sinal: {
    valorCents: number;
    /** Pix copia-e-cola com valor travado (null se o estúdio não tem chave Pix) */
    pixCodigo: string | null;
    /** wa.me pré-preenchido para enviar o comprovante (null sem WhatsApp) */
    waComprovanteUrl: string | null;
  } | null;
};

export type SolicitacaoResult =
  | { ok: true; sucesso: SolicitacaoSucesso }
  | {
      ok: false;
      erro: string;
      /** HORARIO: slot indisponível (voltar e escolher outro) · LIMITE: agenda cheia · DADOS: entrada inválida */
      codigo: "HORARIO" | "LIMITE" | "DADOS";
    };

export type HorariosPublicosResult = { slots: string[] };
