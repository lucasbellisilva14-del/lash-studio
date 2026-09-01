import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { formatWithPattern, localDayKey } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { MonthNav } from "@/components/financeiro/month-nav";
import { SummaryCards, type ResumoMes } from "@/components/financeiro/summary-cards";
import { GoalCard } from "@/components/financeiro/goal-card";
import { LancamentosList } from "@/components/financeiro/lancamentos-list";
import { FinanceiroFab } from "@/components/financeiro/financeiro-fab";
import { BarChart, type ChartMonth } from "@/components/financeiro/bar-chart";
import type { ExpenseCategory, LancamentoItem } from "@/components/financeiro/types";
import {
  materializarDespesasFixas,
  monthKeyOf,
  monthRange,
  shiftMonthKey,
} from "./data";

export const metadata: Metadata = { title: "Financeiro" };

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function FinanceiroPage(props: PageProps<"/financeiro">) {
  const professional = await requireProfessional();
  const professionalId = professional.id;
  const tz = professional.timezone;
  const now = new Date();
  const sp = await props.searchParams;

  const mesAtualKey = monthKeyOf(now, tz);
  const rawMes = primeiro(sp.mes);
  const mes = rawMes && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMes) ? rawMes : mesAtualKey;

  // Despesas fixas do mês corrente entram sozinhas (idempotente).
  await materializarDespesasFixas(professionalId, tz, now);

  const { start, end } = monthRange(mes, tz);
  const { start: chartStart } = monthRange(shiftMonthKey(mes, -5), tz);

  const [
    receitas,
    despesas,
    concluidos,
    faltas,
    cancelamentosTardios,
    goal,
    lancamentos,
    chartTx,
    clientesDoMes,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { professionalId, type: "RECEITA", date: { gte: start, lt: end } },
      _sum: { amountCents: true, netCents: true },
    }),
    prisma.transaction.aggregate({
      where: { professionalId, type: "DESPESA", date: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.appointment.count({
      where: { professionalId, status: "CONCLUIDO", startAt: { gte: start, lt: end } },
    }),
    prisma.appointment.count({
      where: { professionalId, status: "FALTOU", startAt: { gte: start, lt: end } },
    }),
    prisma.appointment.count({
      where: {
        professionalId,
        status: "CANCELADO_TARDE",
        startAt: { gte: start, lt: end },
      },
    }),
    prisma.goal.findUnique({
      where: { professionalId_month: { professionalId, month: mes } },
    }),
    prisma.transaction.findMany({
      where: { professionalId, date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.transaction.findMany({
      where: { professionalId, date: { gte: chartStart, lt: end } },
      select: { type: true, amountCents: true, netCents: true, date: true },
    }),
    prisma.appointment.findMany({
      where: { professionalId, status: "CONCLUIDO", startAt: { gte: start, lt: end } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
  ]);

  // Taxa de retorno: entre as clientes atendidas no mês, % que já tinha
  // atendimento concluído antes do mês.
  const clientIds = clientesDoMes.map((c) => c.clientId);
  const clientesQueVoltaram = clientIds.length
    ? await prisma.appointment.findMany({
        where: {
          professionalId,
          status: "CONCLUIDO",
          clientId: { in: clientIds },
          startAt: { lt: start },
        },
        select: { clientId: true },
        distinct: ["clientId"],
      })
    : [];

  const brutoCents = receitas._sum.amountCents ?? 0;
  const liquidoCents = receitas._sum.netCents ?? 0;
  const despesasCents = despesas._sum.amountCents ?? 0;
  const comparecimentoBase = concluidos + faltas + cancelamentosTardios;

  const resumo: ResumoMes = {
    brutoCents,
    liquidoCents,
    despesasCents,
    lucroCents: liquidoCents - despesasCents,
    ticketMedioCents: concluidos > 0 ? Math.round(liquidoCents / concluidos) : null,
    atendimentos: concluidos,
    comparecimentoPct:
      comparecimentoBase > 0
        ? Math.round((concluidos / comparecimentoBase) * 100)
        : null,
    retornoPct:
      clientIds.length > 0
        ? Math.round((clientesQueVoltaram.length / clientIds.length) * 100)
        : null,
  };

  // Gráfico: receita líquida × despesas por mês (janela de 6 meses até o mês visto).
  const chartKeys = Array.from({ length: 6 }, (_, i) => shiftMonthKey(mes, i - 5));
  const porMes = new Map(
    chartKeys.map((k) => [k, { receitaCents: 0, despesaCents: 0 }]),
  );
  for (const tx of chartTx) {
    const bucket = porMes.get(monthKeyOf(tx.date, tz));
    if (!bucket) continue;
    if (tx.type === "RECEITA") bucket.receitaCents += tx.netCents;
    else if (tx.type === "DESPESA") bucket.despesaCents += tx.amountCents;
  }
  const chartMonths: ChartMonth[] = chartKeys.map((key) => ({
    key,
    label: formatWithPattern(monthRange(key, tz).start, "MMM", tz).replace(".", ""),
    receitaCents: porMes.get(key)?.receitaCents ?? 0,
    despesaCents: porMes.get(key)?.despesaCents ?? 0,
  }));

  const items: LancamentoItem[] = lancamentos.map((t) => ({
    id: t.id,
    type: t.type === "DESPESA" ? "DESPESA" : "RECEITA",
    kind: t.kind === "SINAL" || t.kind === "ATENDIMENTO" ? t.kind : "OUTRO",
    description: t.description,
    category:
      t.category && t.category in EXPENSE_CATEGORIES
        ? (t.category as ExpenseCategory)
        : null,
    method: t.method,
    amountCents: t.amountCents,
    netCents: t.netCents,
    dateLabel: formatWithPattern(t.date, "dd/MM", tz),
    dateKey: localDayKey(t.date, tz),
    recurrence: t.recurrence === "FIXA_MENSAL" ? "FIXA_MENSAL" : "AVULSA",
    appointmentId: t.appointmentId,
  }));

  const monthLabel = capitalize(formatWithPattern(start, "MMMM 'de' yyyy", tz));
  const todayKey = localDayKey(now, tz);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Seu mês em números" />
      <MonthNav
        monthLabel={monthLabel}
        prevHref={`/financeiro?mes=${shiftMonthKey(mes, -1)}`}
        nextHref={`/financeiro?mes=${shiftMonthKey(mes, 1)}`}
      />

      <div className="space-y-7">
        <SummaryCards resumo={resumo} />

        <GoalCard
          monthKey={mes}
          monthLabel={monthLabel}
          targetCents={goal?.revenueTargetCents ?? null}
          netCents={liquidoCents}
        />

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Lançamentos</h2>
            {items.length > 0 ? (
              <p className="text-[13px] text-ink-soft">
                {items.length === 1 ? "1 lançamento" : `${items.length} lançamentos`}
              </p>
            ) : null}
          </div>
          <LancamentosList items={items} todayKey={todayKey} />
        </section>

        <BarChart months={chartMonths} />
      </div>

      <FinanceiroFab todayKey={todayKey} />
    </>
  );
}
