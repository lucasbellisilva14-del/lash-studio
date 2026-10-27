/**
 * Financeiro — as contas. Puras (sem banco): recebem as linhas já buscadas
 * (./data) e devolvem os números das telas. Dinheiro sempre em centavos.
 *
 * Regras (contrato "Equipe" do AGENTS.md):
 * - memberId nulo = a dona. A receita de uma profissional são as transações
 *   RECEITA ligadas a um agendamento dela; receitas sem agendamento e despesas
 *   são do estúdio e só entram em "Estúdio todo".
 * - Comissão = netCents × appointment.commissionPct / 100, arredondada por
 *   transação. A dona não tem comissão.
 * - Pendente de um agendamento = preço − receitas brutas já lançadas para ele
 *   (o sinal, por exemplo). Com o recebimento do atendimento lançado na ficha,
 *   ele está quitado: um desconto dado na hora não vira "atraso" para sempre.
 */
import type { TeamPro } from "@/lib/team-shared";
import type { ApptLeanRow, ApptRow, HistRow, TxLeanRow, TxRow } from "./data";

const ABERTOS = new Set(["PRE_AGENDADO", "CONFIRMADO"]);

function soma<T>(itens: T[], valor: (item: T) => number): number {
  let total = 0;
  for (const item of itens) total += valor(item);
  return total;
}

/* ------------------------------------------------------------------ */
/* Regras de uma linha                                                 */
/* ------------------------------------------------------------------ */

/** Comissão de uma receita (0 para despesa, receita avulsa ou da dona). */
export function comissaoDaTx(tx: Pick<TxLeanRow, "type" | "netCents" | "appointment">): number {
  const appt = tx.appointment;
  if (tx.type !== "RECEITA" || !appt || !appt.memberId || !appt.commissionPct) return 0;
  return Math.round((tx.netCents * appt.commissionPct) / 100);
}

/** O que ainda falta entrar de um agendamento (bruto). */
export function pendenteDoAgendamento(appt: Pick<ApptLeanRow, "priceCents" | "transactions">): number {
  if (appt.transactions.some((t) => t.kind === "ATENDIMENTO")) return 0;
  const jaEntrou = soma(appt.transactions, (t) => t.amountCents);
  return Math.max(0, appt.priceCents - jaEntrou);
}

/** Receita ligada a um agendamento desta profissional (null = a dona). */
export function ehReceitaDa(tx: Pick<TxLeanRow, "type" | "appointment">, memberId: string | null): boolean {
  return tx.type === "RECEITA" && tx.appointment !== null && tx.appointment.memberId === memberId;
}

/* ------------------------------------------------------------------ */
/* Pendências: A receber e Em atraso                                   */
/* ------------------------------------------------------------------ */

export type Pendencias = {
  /** PRE_AGENDADO/CONFIRMADO de hoje em diante (inclui os de hoje já em andamento). */
  aReceberCents: number;
  /** CONCLUIDO sem o recebimento lançado. */
  emAtrasoCents: number;
  /** A receber + Em atraso, descontada a comissão de cada agendamento. */
  parteDoEstudioCents: number;
};

/**
 * `desde` = início do dia de hoje no fuso do estúdio. Horário marcado de dias
 * que já passaram sem ser concluído fica de fora (provável falta não marcada).
 */
export function pendencias(appts: ApptLeanRow[], desde: Date): Pendencias {
  let aReceberCents = 0;
  let emAtrasoCents = 0;
  let parteDoEstudioCents = 0;
  for (const appt of appts) {
    const falta = pendenteDoAgendamento(appt);
    if (falta <= 0) continue;
    if (ABERTOS.has(appt.status) && appt.startAt >= desde) aReceberCents += falta;
    else if (appt.status === "CONCLUIDO") emAtrasoCents += falta;
    else continue;
    const pct = appt.memberId ? (appt.commissionPct ?? 0) : 0;
    parteDoEstudioCents += falta - Math.round((falta * pct) / 100);
  }
  return { aReceberCents, emAtrasoCents, parteDoEstudioCents };
}

/* ------------------------------------------------------------------ */
/* Resumos (os 6 cartões)                                              */
/* ------------------------------------------------------------------ */

export type ResumoEstudio = {
  recebidoCents: number;
  despesasCents: number;
  resultadoCents: number;
  aReceberCents: number;
  emAtrasoCents: number;
  saldoProjetadoCents: number;
};

/** Estúdio todo: todas as receitas e despesas do mês. */
export function resumoEstudio(txs: TxLeanRow[], appts: ApptLeanRow[], desde: Date): ResumoEstudio {
  const recebidoCents = soma(
    txs.filter((tx) => tx.type === "RECEITA"),
    (tx) => tx.netCents,
  );
  const despesasCents = soma(
    txs.filter((tx) => tx.type === "DESPESA"),
    (tx) => tx.amountCents,
  );
  const resultadoCents = recebidoCents - despesasCents;
  const { aReceberCents, emAtrasoCents } = pendencias(appts, desde);
  return {
    recebidoCents,
    despesasCents,
    resultadoCents,
    aReceberCents,
    emAtrasoCents,
    saldoProjetadoCents: resultadoCents + aReceberCents + emAtrasoCents,
  };
}

export type ResumoProfissional = {
  recebidoCents: number;
  comissaoCents: number;
  /** Recebido − comissão. */
  ficaCents: number;
  concluidos: number;
  ticketMedioCents: number | null;
  aReceberCents: number;
  emAtrasoCents: number;
  /** Fica para o estúdio + o que falta entrar, já sem a comissão. */
  saldoProjetadoCents: number;
  /** % de comissão usados nas receitas do mês (congelados por agendamento). */
  pcts: number[];
};

/** Uma profissional (null = a dona): só o que vem dos agendamentos dela. */
export function resumoProfissional(
  txs: TxLeanRow[],
  appts: ApptLeanRow[],
  memberId: string | null,
  desde: Date,
): ResumoProfissional {
  const receitas = txs.filter((tx) => ehReceitaDa(tx, memberId));
  const meus = appts.filter((appt) => appt.memberId === memberId);
  const recebidoCents = soma(receitas, (tx) => tx.netCents);
  const comissaoCents = soma(receitas, comissaoDaTx);
  const ficaCents = recebidoCents - comissaoCents;
  const concluidos = meus.filter((appt) => appt.status === "CONCLUIDO").length;
  const p = pendencias(meus, desde);
  const pcts = new Set<number>();
  for (const tx of receitas) {
    if (memberId && tx.appointment?.commissionPct != null) pcts.add(tx.appointment.commissionPct);
  }
  return {
    recebidoCents,
    comissaoCents,
    ficaCents,
    concluidos,
    ticketMedioCents: concluidos > 0 ? Math.round(recebidoCents / concluidos) : null,
    aReceberCents: p.aReceberCents,
    emAtrasoCents: p.emAtrasoCents,
    saldoProjetadoCents: ficaCents + p.parteDoEstudioCents,
    pcts: [...pcts].sort((a, b) => a - b),
  };
}

/* ------------------------------------------------------------------ */
/* Profissionais do mês (equipe ativa + quem saiu mas teve movimento)  */
/* ------------------------------------------------------------------ */

export type ProDoMes = {
  /** OWNER_KEY ou o id da funcionária (só as ativas filtram a tela). */
  key: string;
  memberId: string | null;
  name: string;
  color: string;
  isOwner: boolean;
  /** false = desativada, aparece só porque teve movimento no mês. */
  ativa: boolean;
  /** % de comissão de hoje (0 para a dona e para quem saiu). */
  commissionPct: number;
};

export function profissionaisDoMes(team: TeamPro[], txs: TxLeanRow[], appts: ApptLeanRow[]): ProDoMes[] {
  const pros: ProDoMes[] = team.map((p) => ({
    key: p.key,
    memberId: p.memberId,
    name: p.name,
    color: p.color,
    isOwner: p.isOwner,
    ativa: true,
    commissionPct: p.commissionPct,
  }));
  const conhecidas = new Set(team.map((p) => p.memberId));
  const extra = (memberId: string | null, member: { name: string; color: string } | null) => {
    if (!memberId || conhecidas.has(memberId) || !member) return;
    conhecidas.add(memberId);
    pros.push({
      key: memberId,
      memberId,
      name: member.name,
      color: member.color,
      isOwner: false,
      ativa: false,
      commissionPct: 0,
    });
  };
  for (const tx of txs) {
    if (tx.type === "RECEITA" && tx.appointment) extra(tx.appointment.memberId, tx.appointment.member);
  }
  for (const appt of appts) extra(appt.memberId, appt.member);
  return pros;
}

/* ------------------------------------------------------------------ */
/* Desempenho da equipe                                                */
/* ------------------------------------------------------------------ */

export type DesempenhoPro = {
  pro: ProDoMes;
  concluidos: number;
  recebidoCents: number;
  ticketMedioCents: number | null;
  comissaoCents: number;
  ficaCents: number;
};

export function desempenhoDaEquipe(pros: ProDoMes[], txs: TxLeanRow[], appts: ApptLeanRow[], desde: Date): DesempenhoPro[] {
  return pros
    .map((pro) => {
      const r = resumoProfissional(txs, appts, pro.memberId, desde);
      return {
        pro,
        concluidos: r.concluidos,
        recebidoCents: r.recebidoCents,
        ticketMedioCents: r.ticketMedioCents,
        comissaoCents: r.comissaoCents,
        ficaCents: r.ficaCents,
      };
    })
    .filter((d) => d.pro.ativa || d.recebidoCents !== 0 || d.concluidos > 0);
}

/* ------------------------------------------------------------------ */
/* Extrato de comissão (aba Comissões e "Meus números")                */
/* ------------------------------------------------------------------ */

export type ExtratoAtendimento = {
  appointmentId: string;
  startAt: Date;
  clientName: string;
  serviceName: string;
  /** Líquido que entrou no mês por este atendimento. */
  recebidoCents: number;
  comissaoCents: number;
  /** % congelado no agendamento. */
  pct: number | null;
  /** Concluído e ainda sem o recebimento do atendimento (ex.: só o sinal entrou). */
  faltaCents: number;
};

export type AtendimentoAguardando = {
  appointmentId: string;
  startAt: Date;
  clientName: string;
  serviceName: string;
  pendenteCents: number;
};

export type Extrato = {
  /** Atendimentos com recebimento no mês (a base da comissão), mais recentes primeiro. */
  linhas: ExtratoAtendimento[];
  /** Concluídos no mês sem nenhum recebimento ainda. */
  aguardando: AtendimentoAguardando[];
  recebidoCents: number;
  comissaoCents: number;
  pcts: number[];
};

export function extratoDaProfissional(memberId: string, txs: TxRow[], appts: ApptRow[]): Extrato {
  const porAgendamento = new Map<string, ExtratoAtendimento>();
  for (const tx of txs) {
    if (!ehReceitaDa(tx, memberId) || !tx.appointment) continue;
    const appt = tx.appointment;
    const linha: ExtratoAtendimento = porAgendamento.get(appt.id) ?? {
      appointmentId: appt.id,
      startAt: appt.startAt,
      clientName: appt.client.name,
      serviceName: appt.service.name,
      recebidoCents: 0,
      comissaoCents: 0,
      pct: appt.commissionPct,
      faltaCents: 0,
    };
    linha.recebidoCents += tx.netCents;
    linha.comissaoCents += comissaoDaTx(tx);
    porAgendamento.set(appt.id, linha);
  }

  const aguardando: AtendimentoAguardando[] = [];
  for (const appt of appts) {
    if (appt.memberId !== memberId || appt.status !== "CONCLUIDO") continue;
    const falta = pendenteDoAgendamento(appt);
    if (falta <= 0) continue;
    const linha = porAgendamento.get(appt.id);
    if (linha) {
      linha.faltaCents = falta;
    } else {
      aguardando.push({
        appointmentId: appt.id,
        startAt: appt.startAt,
        clientName: appt.client.name,
        serviceName: appt.service.name,
        pendenteCents: falta,
      });
    }
  }

  const linhas = [...porAgendamento.values()].sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  aguardando.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  const pcts = new Set<number>();
  for (const l of linhas) if (l.pct != null) pcts.add(l.pct);
  return {
    linhas,
    aguardando,
    recebidoCents: soma(linhas, (l) => l.recebidoCents),
    comissaoCents: soma(linhas, (l) => l.comissaoCents),
    pcts: [...pcts].sort((a, b) => a - b),
  };
}

/* ------------------------------------------------------------------ */
/* Despesas por categoria                                              */
/* ------------------------------------------------------------------ */

/** Soma das despesas do mês por categoria (desconhecida = OUTROS), maior primeiro. */
export function despesasPorCategoria(
  txs: Pick<TxLeanRow, "type" | "category" | "amountCents">[],
  categoriasValidas: readonly string[],
): { key: string; cents: number }[] {
  const porCategoria = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "DESPESA") continue;
    const key = tx.category && categoriasValidas.includes(tx.category) ? tx.category : "OUTROS";
    porCategoria.set(key, (porCategoria.get(key) ?? 0) + tx.amountCents);
  }
  return [...porCategoria.entries()]
    .map(([key, cents]) => ({ key, cents }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}

/* ------------------------------------------------------------------ */
/* Gráfico: entradas x saídas por mês                                  */
/* ------------------------------------------------------------------ */

export type MesDaSerie = { key: string; entradasCents: number; saidasCents: number };

/** Entradas líquidas e saídas por mês ("yyyy-MM"), só para as chaves pedidas. */
export function serieMensal(
  keys: string[],
  rows: Pick<HistRow, "type" | "amountCents" | "netCents" | "date">[],
  chaveDoMes: (date: Date) => string,
): MesDaSerie[] {
  const porMes = new Map(keys.map((key) => [key, { key, entradasCents: 0, saidasCents: 0 }]));
  for (const row of rows) {
    const bucket = porMes.get(chaveDoMes(row.date));
    if (!bucket) continue;
    if (row.type === "RECEITA") bucket.entradasCents += row.netCents;
    else if (row.type === "DESPESA") bucket.saidasCents += row.amountCents;
  }
  return keys.map((key) => porMes.get(key)!);
}

/**
 * Eixo com valores redondos (1, 2, 2,5 ou 5 × 10ⁿ centavos, no mínimo R$ 1)
 * que cobre o maior valor em até `alvoDeLinhas` faixas.
 */
export function escalaDoEixo(maior: number, alvoDeLinhas = 4): { topo: number; ticks: number[] } {
  if (maior <= 0) return { topo: 0, ticks: [0] };
  const bruto = maior / alvoDeLinhas;
  const base = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / base;
  const passo = Math.max(100, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * base);
  const topo = Math.ceil(maior / passo) * passo;
  const ticks: number[] = [];
  for (let v = 0; v <= topo + passo / 2; v += passo) ticks.push(Math.round(v));
  return { topo, ticks };
}
