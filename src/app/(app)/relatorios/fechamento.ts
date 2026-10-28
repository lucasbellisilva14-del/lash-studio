/**
 * Fechamento mensal de uma profissional — o extrato. Puro (sem banco).
 * Mesmas regras do Financeiro (../financeiro/numeros), para o fechamento bater
 * com a aba Comissões: a base da comissão é o que entrou no mês (receitas
 * ligadas a agendamentos dela); comissão = netCents × % congelado no
 * agendamento, arredondada por transação; a dona não tem comissão. Diferente
 * do extrato do Financeiro, aceita a dona (memberId nulo).
 */
import type { ApptLeanRow, TxRow } from "@/app/(app)/financeiro/data";
import { comissaoDaTx, ehReceitaDa, pendenteDoAgendamento } from "@/app/(app)/financeiro/numeros";

export type LinhaDoFechamento = {
  appointmentId: string;
  startAt: Date;
  clientName: string;
  serviceName: string;
  /** Líquido que entrou no mês por este atendimento. */
  recebidoCents: number;
  comissaoCents: number;
  /** Concluído e ainda sem o recebimento do atendimento (ex.: só o sinal entrou). */
  faltaCents: number;
};

export type ExtratoDoFechamento = {
  /** Atendimentos com recebimento no mês, em ordem de data. */
  linhas: LinhaDoFechamento[];
  /** Concluídos no mês sem nenhum recebimento ainda: a comissão entra quando o pagamento for lançado. */
  aguardando: { quantidade: number; pendenteCents: number };
};

/**
 * `txs`: receitas do mês (com o atendimento ligado); `appts`: agendamentos
 * do mês que podem gerar recebimento.
 */
export function extratoDoFechamento(
  memberId: string | null,
  txs: TxRow[],
  appts: ApptLeanRow[],
): ExtratoDoFechamento {
  const porAgendamento = new Map<string, LinhaDoFechamento>();
  for (const tx of txs) {
    if (!ehReceitaDa(tx, memberId) || !tx.appointment) continue;
    const appt = tx.appointment;
    const linha: LinhaDoFechamento = porAgendamento.get(appt.id) ?? {
      appointmentId: appt.id,
      startAt: appt.startAt,
      clientName: appt.client.name,
      serviceName: appt.service.name,
      recebidoCents: 0,
      comissaoCents: 0,
      faltaCents: 0,
    };
    linha.recebidoCents += tx.netCents;
    linha.comissaoCents += comissaoDaTx(tx);
    porAgendamento.set(appt.id, linha);
  }

  let quantidade = 0;
  let pendenteCents = 0;
  for (const appt of appts) {
    if (appt.memberId !== memberId || appt.status !== "CONCLUIDO") continue;
    const falta = pendenteDoAgendamento(appt);
    if (falta <= 0) continue;
    const linha = porAgendamento.get(appt.id);
    if (linha) {
      linha.faltaCents = falta;
    } else {
      quantidade += 1;
      pendenteCents += falta;
    }
  }

  const linhas = [...porAgendamento.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return { linhas, aguardando: { quantidade, pendenteCents } };
}

/**
 * % de comissão do mês: o único usado nas receitas, "variável" se mudou no meio
 * do mês, ou o % de hoje quando ainda não entrou nada (null = não se aplica).
 */
export function rotuloDoPct(pcts: number[], atual: number | null): string | null {
  if (pcts.length === 1) return `${pcts[0]}%`;
  if (pcts.length > 1) return "variável";
  return atual != null ? `${atual}%` : null;
}
