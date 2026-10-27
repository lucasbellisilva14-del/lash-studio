/** Tipos serializáveis compartilhados entre a página server e os componentes client da Agenda. */
import type { AppointmentStatus, ServiceCategory } from "@/lib/constants";

export type AgendaCliente = {
  id: string;
  nome: string;
  telefone: string;
  faltas: number;
  temContraindicacao: boolean;
  flags: string[];
};

export type AgendaServico = {
  id: string;
  nome: string;
  categoria: ServiceCategory;
  duracaoMin: number;
  precoCents: number;
  exigeSinal: boolean;
  manutencaoDeId: string | null;
};

/** Quem atende um agendamento (memberId nulo = a dona). */
export type AgendaQuemAtende = {
  /** OWNER_KEY ("dona") ou o id da funcionária. */
  key: string;
  memberId: string | null;
  nome: string;
  cor: string;
};

/** Profissional da equipe para filtros e seletores (só a dona com equipe recebe a lista). */
export type AgendaPro = AgendaQuemAtende & {
  /** Rótulo curto e único na tela: "Você", "Ana", "Ana P.". */
  rotulo: string;
};

export type AgendaCompromisso = {
  id: string;
  /** ISO UTC */
  inicio: string;
  fim: string;
  status: AppointmentStatus;
  precoCents: number;
  sinalExigido: boolean;
  sinalCents: number | null;
  sinalPagoEm: string | null;
  observacoes: string | null;
  cliente: AgendaCliente;
  servico: { id: string; nome: string; categoria: ServiceCategory };
  profissional: AgendaQuemAtende;
};

export type AgendaBloqueio = {
  id: string;
  titulo: string;
  tipo: string; // AVULSO | SEMANAL
  inicio: string | null; // ISO UTC (AVULSO)
  fim: string | null;
  diaSemana: number | null; // 0-6 (SEMANAL)
  horaInicio: string | null; // "12:00"
  horaFim: string | null;
  /** Vale para o estúdio inteiro (toda a equipe). */
  estudioInteiro: boolean;
  /** A quem vale, para exibir com equipe ("Estúdio inteiro", "Você", "Ana"); nulo sem equipe. */
  para: string | null;
};

/** Quem está logada, no que importa para a tela (sem dados sensíveis). */
export type AgendaViewer = {
  isOwner: boolean;
  memberId: string | null;
};

export type HorarioFuncionamento = {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
};

/** Configurações da profissional necessárias no client (sem dados sensíveis). */
export type AgendaConfig = {
  timezone: string;
  bufferMinutes: number;
  minAdvanceHours: number;
  cancellationWindowHours: number;
  maintenanceLimitDays: number;
  maintenanceNoticeDay: number;
  depositType: string;
  depositValue: number;
  noShowThreshold: number;
};

export type VisaoAgenda = "dia" | "semana" | "mes";

export type EsperaChamada = {
  id: string;
  nome: string;
  telefone: string;
  periodo: string | null;
  waUrl: string;
};
