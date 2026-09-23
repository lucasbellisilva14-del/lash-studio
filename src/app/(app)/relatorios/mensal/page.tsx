/**
 * Fechamento do mês — relatório imprimível (Salvar como PDF).
 * Identidade do estúdio (logo/cores), números do mês e detalhamentos.
 */
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKeyToUtcStart, formatWithPattern } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/constants";
import { PrintButton } from "./print-button";

export const metadata = { title: "Fechamento do mês" };

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function FechamentoPage(props: PageProps<"/relatorios/mensal">) {
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const sp = await props.searchParams;

  const raw = Array.isArray(sp.mes) ? sp.mes[0] : sp.mes;
  const mesKey =
    raw && /^\d{4}-\d{2}$/.test(raw) ? raw : formatWithPattern(new Date(), "yyyy-MM", tz);
  const [ano, mes] = mesKey.split("-").map(Number);
  const proxKey =
    mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const inicio = dayKeyToUtcStart(`${mesKey}-01`, tz);
  const fim = dayKeyToUtcStart(`${proxKey}-01`, tz);
  const professionalId = professional.id;

  const [receitas, despesas, concluidos, faltas, novasClientes, goal] = await Promise.all([
    prisma.transaction.findMany({
      where: { professionalId, type: "RECEITA", date: { gte: inicio, lt: fim } },
      select: { amountCents: true, netCents: true, feeCents: true, method: true },
    }),
    prisma.transaction.aggregate({
      where: { professionalId, type: "DESPESA", date: { gte: inicio, lt: fim } },
      _sum: { amountCents: true },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: "CONCLUIDO",
        startAt: { gte: inicio, lt: fim },
      },
      include: { service: { select: { name: true } } },
    }),
    prisma.appointment.count({
      where: {
        professionalId,
        status: { in: ["FALTOU", "CANCELADO_TARDE"] },
        startAt: { gte: inicio, lt: fim },
      },
    }),
    prisma.client.count({
      where: { professionalId, createdAt: { gte: inicio, lt: fim } },
    }),
    prisma.goal.findUnique({
      where: { professionalId_month: { professionalId, month: mesKey } },
    }),
  ]);

  const brutoCents = receitas.reduce((s, t) => s + t.amountCents, 0);
  const liquidoCents = receitas.reduce((s, t) => s + t.netCents, 0);
  const taxasCents = receitas.reduce((s, t) => s + t.feeCents, 0);
  const despesasCents = despesas._sum.amountCents ?? 0;
  const lucroCents = liquidoCents - despesasCents;
  const ticketCents =
    concluidos.length > 0 ? Math.round(liquidoCents / concluidos.length) : 0;

  // Top serviços por receita (preço dos atendimentos concluídos)
  const porServico = new Map<string, { total: number; qtd: number }>();
  for (const a of concluidos) {
    const atual = porServico.get(a.service.name) ?? { total: 0, qtd: 0 };
    atual.total += a.priceCents;
    atual.qtd += 1;
    porServico.set(a.service.name, atual);
  }
  const topServicos = [...porServico.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  // Recebimentos por forma de pagamento
  const porMetodo = new Map<string, number>();
  for (const t of receitas) {
    const metodo = t.method ?? "OUTRO";
    porMetodo.set(metodo, (porMetodo.get(metodo) ?? 0) + t.netCents);
  }
  const metodos = [...porMetodo.entries()].sort((a, b) => b[1] - a[1]);

  const rotuloMes = capitalizar(formatWithPattern(inicio, "MMMM 'de' yyyy", tz));
  const metaPct = goal
    ? Math.min(100, Math.round((liquidoCents / goal.revenueTargetCents) * 100))
    : null;

  return (
    <div className="print-report">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Fechamento do mês
          </h1>
          <p className="text-sm text-ink-soft">{rotuloMes}</p>
        </div>
        <PrintButton />
      </div>

      {/* ── Documento ── */}
      <div className="rounded-2xl border border-line bg-surface p-6 print:border-0 print:p-0 print:rounded-none">
        <header className="flex items-center gap-4 border-b border-line pb-5">
          {professional.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={professional.logoUrl}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover border border-line"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white font-display text-xl font-semibold">
              {professional.studioName.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 grow">
            <p className="font-display text-xl font-semibold text-ink">
              {professional.studioName}
            </p>
            <p className="text-sm text-ink-soft">Fechamento · {rotuloMes}</p>
          </div>
          <p className="text-xs text-ink-faint shrink-0">
            Emitido em {formatWithPattern(new Date(), "dd/MM/yyyy", tz)}
          </p>
        </header>

        {/* Resumo principal */}
        <section className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Lucro do mês
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-0.5">
              {formatBRL(lucroCents)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Faturamento líquido
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-0.5">
              {formatBRL(liquidoCents)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Atendimentos
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-0.5">
              {concluidos.length}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Ticket médio
            </p>
            <p className="font-display text-xl font-semibold text-ink mt-0.5">
              {formatBRL(ticketCents)}
            </p>
          </div>
        </section>

        {/* Financeiro detalhado */}
        <section className="border-t border-line py-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Financeiro</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Faturamento bruto</dt>
              <dd className="font-medium text-ink tabular-nums">{formatBRL(brutoCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Taxas de pagamento</dt>
              <dd className="font-medium text-ink tabular-nums">
                − {formatBRL(taxasCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Despesas</dt>
              <dd className="font-medium text-ink tabular-nums">
                − {formatBRL(despesasCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5">
              <dt className="font-semibold text-ink">Lucro</dt>
              <dd className="font-semibold text-ink tabular-nums">{formatBRL(lucroCents)}</dd>
            </div>
            {metaPct !== null && goal ? (
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  Meta do mês ({formatBRL(goal.revenueTargetCents)})
                </dt>
                <dd className="font-medium text-ink tabular-nums">{metaPct}% atingida</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* Serviços que mais renderam */}
        {topServicos.length > 0 ? (
          <section className="border-t border-line py-5">
            <h2 className="text-sm font-semibold text-ink mb-3">
              Serviços que mais renderam
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="pb-1.5 font-semibold">Serviço</th>
                  <th className="pb-1.5 font-semibold text-right">Qtd.</th>
                  <th className="pb-1.5 font-semibold text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {topServicos.map(([nome, dados]) => (
                  <tr key={nome}>
                    <td className="py-1.5 text-ink">{nome}</td>
                    <td className="py-1.5 text-right text-ink-soft tabular-nums">
                      {dados.qtd}
                    </td>
                    <td className="py-1.5 text-right font-medium text-ink tabular-nums">
                      {formatBRL(dados.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {/* Formas de pagamento + clientes */}
        <section className="border-t border-line py-5 grid gap-6 sm:grid-cols-2">
          {metodos.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-ink mb-3">Recebimentos por forma</h2>
              <dl className="space-y-1.5 text-sm">
                {metodos.map(([metodo, cents]) => (
                  <div key={metodo} className="flex justify-between">
                    <dt className="text-ink-soft">
                      {(PAYMENT_METHODS as Record<string, string>)[metodo] ?? metodo}
                    </dt>
                    <dd className="font-medium text-ink tabular-nums">{formatBRL(cents)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold text-ink mb-3">Clientes</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Clientes novas no mês</dt>
                <dd className="font-medium text-ink tabular-nums">{novasClientes}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Faltas + cancelamentos tardios</dt>
                <dd className="font-medium text-ink tabular-nums">{faltas}</dd>
              </div>
            </dl>
          </div>
        </section>

        <footer className="border-t border-line pt-4 text-center text-xs text-ink-faint">
          Relatório gerado pelo LashOS 💗
        </footer>
      </div>
    </div>
  );
}
