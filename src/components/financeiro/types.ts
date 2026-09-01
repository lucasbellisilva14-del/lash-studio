/** Tipos compartilhados do módulo Financeiro. */
import type { EXPENSE_CATEGORIES } from "@/lib/constants";

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export type Recurrence = "AVULSA" | "FIXA_MENSAL";

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
