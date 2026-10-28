/**
 * Fechamento do mês — relatório imprimível (Salvar como PDF).
 * Identidade do estúdio (logo/cores), números do mês e detalhamentos.
 *
 * Com equipe: escolha do mês e da profissional (?mes=yyyy-MM, ?prof=), fora
 * da impressão. A versão de uma profissional (./profissional) traz a comissão,
 * os atendimentos, os indicadores do mês e o comprovante de pagamento; a do
 * "Estúdio todo" segue como sempre. Sem equipe, nada muda.
 */
import type { Metadata } from "next";
import { requireOwner, requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKeyToUtcStart, formatWithPattern } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/constants";
import { ALL_KEY, parseProFilter, proLabel } from "@/lib/team-shared";
import { PeriodBar } from "@/components/financeiro/period-bar";
import { ProFilter, type ProFilterOption } from "@/components/financeiro/pro-filter";
import { DocCabecalho, DocFolha, DocRodape } from "@/components/relatorios/fechamento-doc";
import { profissionaisDoPeriodo, type ProRelatorio } from "../data";
import { fechamentoHref, primeiro } from "../links";
import { PrintButton } from "./print-button";
import { FechamentoDaProfissional } from "./profissional";

type SearchParams = Record<string, string | string[] | undefined>;

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Desloca uma chave "yyyy-MM" em `delta` meses. */
function deslocarMes(key: string, delta: number): string {
  const [ano, mes] = key.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Mês pedido, profissionais e filtro — o mesmo para a página e o título do PDF. */
async function contextoDoFechamento(
  professional: { id: string; timezone: string },
  sp: SearchParams,
) {
  const tz = professional.timezone;
  const agora = new Date();
  const mesAtual = formatWithPattern(agora, "yyyy-MM", tz);
  const raw = primeiro(sp.mes);
  const mesKey = raw && MES_RE.test(raw) ? raw : mesAtual;
  const inicio = dayKeyToUtcStart(`${mesKey}-01`, tz);
  const fim = dayKeyToUtcStart(`${deslocarMes(mesKey, 1)}-01`, tz);

  // A dona, a equipe ativa e quem saiu mas teve agendamento ou recebimento no mês.
  const pros = await profissionaisDoPeriodo(professional.id, inicio.getTime(), fim.getTime(), true);
  const comEquipe = pros.length > 1;
  const filtro = comEquipe ? parseProFilter(primeiro(sp.prof), pros) : null;
  const pro: ProRelatorio | null =
    filtro && !filtro.all ? (pros.find((p) => p.key === filtro.pro.key) ?? null) : null;

  return {
    agora,
    mesAtual,
    mesKey,
    inicio,
    fim,
    pros,
    comEquipe,
    pro,
    /** "outubro de 2026" */
    mesExtenso: formatWithPattern(inicio, "MMMM 'de' yyyy", tz),
  };
}

export async function generateMetadata(props: PageProps<"/relatorios/mensal">): Promise<Metadata> {
  await requireOwner();
  const professional = await requireProfessional();
  const { pro, mesExtenso } = await contextoDoFechamento(professional, await props.searchParams);
  // O título vira o nome do PDF: um arquivo por profissional.
  return { title: pro ? `Fechamento de ${mesExtenso} · ${pro.name}` : "Fechamento do mês" };
}

export default async function FechamentoPage(props: PageProps<"/relatorios/mensal">) {
  const viewer = await requireOwner();
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const sp = await props.searchParams;

  const { agora, mesAtual, mesKey, inicio, fim, pros, comEquipe, pro, mesExtenso } =
    await contextoDoFechamento(professional, sp);
  const rotuloMes = capitalizar(mesExtenso);
  const nomeDe = (p: ProRelatorio) => proLabel(p, viewer.memberId);

  const cabecalhoDaTela = (
    <div className="no-print mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">
          Fechamento do mês
        </h1>
        <p className="text-sm text-ink-soft">{pro ? `${rotuloMes} · ${nomeDe(pro)}` : rotuloMes}</p>
      </div>
      <PrintButton />
    </div>
  );

  // Com equipe: mês e profissional (fora da impressão); trocar um preserva o outro.
  const mesNaUrl = (mes: string) => (mes === mesAtual ? null : mes);
  const profUrl = pro?.key ?? null;
  const opcoes: ProFilterOption[] = [
    {
      key: ALL_KEY,
      label: "Estúdio todo",
      color: null,
      href: fechamentoHref({ mes: mesNaUrl(mesKey) }),
      selected: !pro,
    },
    ...pros.map((p) => ({
      key: p.key,
      label: nomeDe(p),
      color: p.color,
      href: fechamentoHref({ mes: mesNaUrl(mesKey), prof: p.key }),
      selected: pro?.key === p.key,
    })),
  ];
  // Navegação de mês para todas; o filtro de profissional só com equipe.
  const filtros = (
    <div className="no-print mb-5 space-y-3">
      <PeriodBar
        label={rotuloMes}
        prevHref={fechamentoHref({ mes: mesNaUrl(deslocarMes(mesKey, -1)), prof: profUrl })}
        nextHref={fechamentoHref({ mes: mesNaUrl(deslocarMes(mesKey, 1)), prof: profUrl })}
        thisMonthHref={fechamentoHref({ prof: profUrl })}
        isCurrent={mesKey === mesAtual}
      />
      {comEquipe ? <ProFilter options={opcoes} /> : null}
    </div>
  );

  if (pro) {
    return (
      <div className="print-report">
        {cabecalhoDaTela}
        {filtros}
        <FechamentoDaProfissional
          professional={professional}
          pro={pro}
          janela={{ inicio, fim }}
          agora={agora}
          mesExtenso={mesExtenso}
        />
      </div>
    );
  }

  // ── Estúdio todo ──
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

  const metaPct = goal
    ? Math.min(100, Math.round((liquidoCents / goal.revenueTargetCents) * 100))
    : null;

  return (
    <div className="print-report">
      {cabecalhoDaTela}
      {filtros}

      {/* ── Documento ── */}
      <DocFolha>
        <DocCabecalho
          studioName={professional.studioName}
          logoUrl={professional.logoUrl}
          subtitulo={`Fechamento · ${rotuloMes}`}
          emitidoEm={formatWithPattern(new Date(), "dd/MM/yyyy", tz)}
        />

        {/* Resumo principal */}
        <section className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Lucro do mês
            </p>
            <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink mt-0.5">
              {formatBRL(lucroCents)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Faturamento líquido
            </p>
            <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink mt-0.5">
              {formatBRL(liquidoCents)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Atendimentos
            </p>
            <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink mt-0.5">
              {concluidos.length}
            </p>
          </div>
          <div className="rounded-xl bg-surface-sunken/60 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Ticket médio
            </p>
            <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink mt-0.5">
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

        <DocRodape />
      </DocFolha>
    </div>
  );
}
