/**
 * Financeiro — consultas e materialização idempotente das despesas fixas.
 * Só no servidor (page/server actions). Poucas consultas amplas por tela: a
 * conexão de produção tem connection_limit=1, então as contas são feitas em
 * memória (./numeros) em vez de muitas agregações paralelas.
 */
import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatWithPattern, localTimeOf, localToUtc } from "@/lib/dates";
import { daysInMonth, monthKeyOf, monthRange, shiftMonthKey } from "./mes";

/** Status que ainda podem gerar recebimento (A receber / Em atraso). */
export const STATUS_COM_RECEBIMENTO = ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO"];

/*
 * Cada relação aninhada custa uma ida ao banco. Por isso há a versão enxuta
 * (números, gráfico, lançamentos) e a "com nomes" (extrato de comissão, que
 * mostra cliente e serviço de cada atendimento).
 */

const txBase = {
  id: true,
  type: true,
  kind: true,
  description: true,
  category: true,
  method: true,
  amountCents: true,
  netCents: true,
  recurrence: true,
  date: true,
  appointmentId: true,
} satisfies Prisma.TransactionSelect;

/** Quem atendeu e o % congelado (nome/cor de quem já saiu da equipe incluídos). */
const atendimentoDaTx = {
  id: true,
  startAt: true,
  memberId: true,
  commissionPct: true,
  member: { select: { name: true, color: true } },
} satisfies Prisma.AppointmentSelect;

const nomes = {
  client: { select: { name: true } },
  service: { select: { name: true } },
} satisfies Prisma.AppointmentSelect;

/** Lançamento com o atendimento ligado (filtro por profissional e comissão). */
export const txSelectLean = {
  ...txBase,
  appointment: { select: atendimentoDaTx },
} satisfies Prisma.TransactionSelect;

/** Idem, com cliente e serviço do atendimento (extrato). */
export const txSelect = {
  ...txBase,
  appointment: { select: { ...atendimentoDaTx, ...nomes } },
} satisfies Prisma.TransactionSelect;

export type TxLeanRow = Prisma.TransactionGetPayload<{ select: typeof txSelectLean }>;
export type TxRow = Prisma.TransactionGetPayload<{ select: typeof txSelect }>;

/** Agendamento do mês com o que já entrou de receita ligada a ele (qualquer data). */
export const apptSelectLean = {
  id: true,
  status: true,
  startAt: true,
  priceCents: true,
  memberId: true,
  commissionPct: true,
  member: { select: { name: true, color: true } },
  transactions: {
    where: { type: "RECEITA" },
    select: { kind: true, amountCents: true },
  },
} satisfies Prisma.AppointmentSelect;

/** Idem, com cliente e serviço (extrato: "Aguardando pagamento"). */
export const apptSelect = { ...apptSelectLean, ...nomes } satisfies Prisma.AppointmentSelect;

export type ApptLeanRow = Prisma.AppointmentGetPayload<{ select: typeof apptSelectLean }>;
export type ApptRow = Prisma.AppointmentGetPayload<{ select: typeof apptSelect }>;

/** Linha mínima do histórico (gráfico de 6 meses). */
export const histSelect = {
  type: true,
  amountCents: true,
  netCents: true,
  date: true,
} satisfies Prisma.TransactionSelect;

export type HistRow = Prisma.TransactionGetPayload<{ select: typeof histSelect }>;

type TxWhere = Prisma.TransactionWhereInput & { professionalId: string };
type ApptWhere = Prisma.AppointmentWhereInput & { professionalId: string };

const ordemDosLancamentos: Prisma.TransactionOrderByWithRelationInput[] = [
  { date: "desc" },
  { createdAt: "desc" },
];

/** Lançamentos (mais recentes primeiro). O `where` sempre traz o professionalId. */
export function buscarLancamentos(where: TxWhere) {
  return prisma.transaction.findMany({ where, orderBy: ordemDosLancamentos, select: txSelectLean });
}

/** Lançamentos com cliente e serviço do atendimento (extrato de comissão). */
export function buscarLancamentosComNomes(where: TxWhere) {
  return prisma.transaction.findMany({ where, orderBy: ordemDosLancamentos, select: txSelect });
}

/** Agendamentos que podem gerar recebimento. O `where` sempre traz o professionalId. */
export function buscarAgendamentos(where: ApptWhere) {
  return prisma.appointment.findMany({
    where: { ...where, status: { in: STATUS_COM_RECEBIMENTO } },
    orderBy: { startAt: "asc" },
    select: apptSelectLean,
  });
}

/** Idem, com cliente e serviço (extrato de comissão). */
export function buscarAgendamentosComNomes(where: ApptWhere) {
  return prisma.appointment.findMany({
    where: { ...where, status: { in: STATUS_COM_RECEBIMENTO } },
    orderBy: { startAt: "asc" },
    select: apptSelect,
  });
}

/** Histórico enxuto para o gráfico. O `where` sempre traz o professionalId. */
export function buscarHistorico(where: Prisma.TransactionWhereInput & { professionalId: string }) {
  return prisma.transaction.findMany({ where, select: histSelect });
}

/** Meta de recebimento do mês ("yyyy-MM"), em centavos; null sem meta. */
export async function buscarMeta(professionalId: string, month: string): Promise<number | null> {
  const goal = await prisma.goal.findUnique({
    where: { professionalId_month: { professionalId, month } },
    select: { revenueTargetCents: true },
  });
  return goal?.revenueTargetCents ?? null;
}

/**
 * Pagamentos de comissão já lançados: despesas em "Comissões da equipe" com a
 * descrição padrão do botão "Lançar pagamento" (soma por descrição).
 */
export async function buscarPagamentosDeComissao(
  professionalId: string,
  descricoes: string[],
): Promise<Map<string, number>> {
  const pagos = new Map<string, number>();
  if (descricoes.length === 0) return pagos;
  const rows = await prisma.transaction.groupBy({
    by: ["description"],
    where: {
      professionalId,
      type: "DESPESA",
      category: "COMISSOES",
      description: { in: descricoes },
    },
    _sum: { amountCents: true },
  });
  for (const row of rows) pagos.set(row.description, row._sum.amountCents ?? 0);
  return pagos;
}

/**
 * Materializa no mês corrente as despesas FIXA_MENSAL do mês anterior:
 * para cada uma sem correspondente (mesma descrição + categoria) no mês atual
 * cujo dia já chegou, cria a cópia na data equivalente. Idempotente — verifica
 * existência antes de criar e deduplica dentro do próprio lote.
 */
export async function materializarDespesasFixas(
  professionalId: string,
  tz: string,
  agora = new Date(),
): Promise<void> {
  const mesAtual = monthKeyOf(agora, tz);
  const mesAnterior = shiftMonthKey(mesAtual, -1);
  const anterior = monthRange(mesAnterior, tz);
  const atual = monthRange(mesAtual, tz);

  const fixasDoMesAnterior = await prisma.transaction.findMany({
    where: {
      professionalId,
      type: "DESPESA",
      recurrence: "FIXA_MENSAL",
      date: { gte: anterior.start, lt: anterior.end },
    },
  });
  if (fixasDoMesAnterior.length === 0) return;

  const doMesAtual = await prisma.transaction.findMany({
    where: {
      professionalId,
      type: "DESPESA",
      date: { gte: atual.start, lt: atual.end },
    },
    select: { description: true, category: true },
  });

  const chave = (description: string, category: string | null) =>
    `${description}\u001f${category ?? ""}`;
  const existentes = new Set(doMesAtual.map((d) => chave(d.description, d.category)));
  const ultimoDia = daysInMonth(mesAtual);
  const diaHoje = Number(formatWithPattern(agora, "d", tz));

  const criacoes: Prisma.PrismaPromise<unknown>[] = [];
  for (const origem of fixasDoMesAnterior) {
    const k = chave(origem.description, origem.category);
    if (existentes.has(k)) continue;

    const diaOrigem = Number(formatWithPattern(origem.date, "d", tz));
    const dia = Math.min(diaOrigem, ultimoDia);
    if (dia > diaHoje) continue; // o dia dessa despesa ainda não chegou

    existentes.add(k); // não duplicar dentro do mesmo lote
    criacoes.push(
      prisma.transaction.create({
        data: {
          professionalId,
          type: "DESPESA",
          kind: "OUTRO",
          description: origem.description,
          category: origem.category,
          amountCents: origem.amountCents,
          method: origem.method,
          installments: origem.installments,
          feePct: origem.feePct,
          feeCents: origem.feeCents,
          netCents: origem.netCents,
          recurrence: "FIXA_MENSAL",
          date: localToUtc(
            `${mesAtual}-${String(dia).padStart(2, "0")}`,
            localTimeOf(origem.date, tz),
            tz,
          ),
        },
      }),
    );
  }

  if (criacoes.length > 0) await prisma.$transaction(criacoes);
}
