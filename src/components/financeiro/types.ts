/** Tipos compartilhados do módulo Financeiro (dados já prontos para a tela). */
import type { EXPENSE_CATEGORIES } from "@/lib/constants";

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export type Recurrence = "AVULSA" | "FIXA_MENSAL";

/** Profissional de um lançamento ou linha (só aparece quando o estúdio tem equipe). */
export type ProTag = { label: string; color: string };

/** Linha da lista de lançamentos do mês (dados já formatáveis no cliente). */
export type LancamentoItem = {
  id: string;
  type: "RECEITA" | "DESPESA";
  kind: "SINAL" | "ATENDIMENTO" | "OUTRO";
  description: string;
  category: ExpenseCategory | null;
  /** Chave de PAYMENT_METHODS, quando houver. */
  method: string | null;
  amountCents: number;
  netCents: number;
  /** "dd/MM" no fuso da profissional. */
  dateLabel: string;
  /** "yyyy-MM-dd" no fuso da profissional (edição de despesa). */
  dateKey: string;
  recurrence: Recurrence;
  appointmentId: string | null;
  /** Quem atendeu (receitas de agendamento, com equipe). */
  pro: ProTag | null;
};

/** Dados que o Sheet de despesa precisa para editar. */
export type ExpenseDraft = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amountCents: number;
  dateKey: string;
  recurrence: Recurrence;
};

/** Despesa nova já preenchida (ex.: pagamento de comissão). */
export type ExpensePreset = {
  description: string;
  category: ExpenseCategory;
  amountCents: number;
  /** Linha do topo do Sheet explicando o lançamento. */
  note?: string;
};

/** Cartão de número do painel. */
export type StatTone = "ink" | "success" | "danger";

export type StatItem = {
  key: string;
  label: string;
  /** Já formatado (dinheiro, contagem ou "—"). */
  value: string;
  /** Explica a conta do cartão. */
  hint: string;
  tone?: StatTone;
};

/** Mês do gráfico de entradas x saídas (rótulos prontos no servidor). */
export type ChartMonth = {
  key: string;
  /** "out" */
  label: string;
  /** "Outubro de 2026" */
  longLabel: string;
  entradasCents: number;
  saidasCents: number;
};

/** Linha de grade do eixo vertical. */
export type ChartTick = {
  cents: number;
  /** Compacto: "R$ 2 mil" */
  label: string;
};

/** Barra de "Despesas por categoria". */
export type CategoriaItem = {
  key: string;
  label: string;
  cents: number;
  /** % do total de despesas do mês (0–100, sem arredondar). */
  pct: number;
};

/** Linha de "Desempenho da equipe". */
export type DesempenhoItem = {
  key: string;
  name: string;
  /** "Você" ou o primeiro nome. */
  label: string;
  initials: string;
  color: string;
  /** Desativada: aparece porque teve movimento, mas não filtra a tela. */
  inactive: boolean;
  isOwner: boolean;
  /** Aplica o filtro desta profissional (null para quem saiu). */
  href: string | null;
  concluidos: number;
  recebidoCents: number;
  ticketMedioCents: number | null;
  comissaoCents: number;
  ficaCents: number;
};

/** Atendimento no extrato de comissão. */
export type ExtratoLinha = {
  id: string;
  /** "dd/MM" */
  dateLabel: string;
  clientName: string;
  serviceName: string;
  recebidoCents: number;
  comissaoCents: number;
  /** Concluído e ainda sem o recebimento do atendimento. */
  faltaCents: number;
  /** Ficha do atendimento. */
  href: string;
};

/** Concluído no mês sem nenhum recebimento lançado. */
export type AguardandoLinha = {
  id: string;
  dateLabel: string;
  clientName: string;
  serviceName: string;
  pendenteCents: number;
  href: string;
};

/** Uma funcionária na aba Comissões. */
export type ComissaoMembro = {
  key: string;
  name: string;
  initials: string;
  color: string;
  inactive: boolean;
  /** "40%" ou "Variável". */
  pctLabel: string;
  atendimentos: number;
  recebidoCents: number;
  comissaoCents: number;
  /** Já lançado como despesa em Comissões da equipe (descrição padrão). */
  pagoCents: number;
  /** Descrição padrão da despesa de pagamento. */
  descricaoPagamento: string;
  /** Fechamento do mês dela em PDF, com o comprovante da comissão. */
  reciboHref: string;
  linhas: ExtratoLinha[];
  aguardando: AguardandoLinha[];
};
