/**
 * Financeiro da dona: Visão geral (6 números, meta, entradas x saídas,
 * despesas por categoria e desempenho da equipe), Lançamentos e Comissões
 * (só com equipe). Filtro de profissional via ?prof= (só chaves de getTeam).
 */
import type { Professional } from "@prisma/client";
import { dayKeyToUtcStart, formatWithPattern, localDayKey } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import type { Viewer } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { ALL_KEY, firstName, initials, parseProFilter, proLabel, type TeamPro } from "@/lib/team-shared";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { BarChart } from "@/components/financeiro/bar-chart";
import { CategoriasCard } from "@/components/financeiro/categorias-card";
import { ComissoesPanel } from "@/components/financeiro/comissoes-panel";
import { DesempenhoCard } from "@/components/financeiro/desempenho-card";
import { formatBRLCompact, formatSignedBRL, plural } from "@/components/financeiro/format";
import { GoalCard } from "@/components/financeiro/goal-card";
import { HeaderActions } from "@/components/financeiro/header-actions";
import { LancamentosList } from "@/components/financeiro/lancamentos-list";
import { PeriodBar } from "@/components/financeiro/period-bar";
import { ProFilter, type ProFilterOption } from "@/components/financeiro/pro-filter";
import { StatGrid } from "@/components/financeiro/stat-grid";
import type {
  CategoriaItem,
  ChartMonth,
  ComissaoMembro,
  DesempenhoItem,
  ExpenseCategory,
  LancamentoItem,
  ProTag,
  StatItem,
} from "@/components/financeiro/types";
import {
  buscarAgendamentos,
  buscarAgendamentosComNomes,
  buscarHistorico,
  buscarLancamentos,
  buscarLancamentosComNomes,
  buscarMeta,
  buscarPagamentosDeComissao,
  materializarDespesasFixas,
  type TxLeanRow,
} from "./data";
import { financeiroHref, isAba, primeiro, type Aba } from "./links";
import { isMonthKey, monthKeyOf, monthLabel, monthRange, monthShortLabel, shiftMonthKey } from "./mes";
import {
  desempenhoDaEquipe,
  despesasPorCategoria,
  ehReceitaDa,
  escalaDoEixo,
  extratoDaProfissional,
  profissionaisDoMes,
  resumoEstudio,
  resumoProfissional,
  serieMensal,
  type ProDoMes,
} from "./numeros";

type SearchParams = Record<string, string | string[] | undefined>;

const CATEGORIAS = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[];

/** Descrição padrão do pagamento de comissão (máx. 80 caracteres, como a despesa). */
function descricaoPagamento(nome: string, mes: string): string {
  const sufixo = ` · ${mes}`;
  const max = 80 - "Comissão ".length - sufixo.length;
  const curto = nome.length > max ? `${nome.slice(0, max - 1).trimEnd()}…` : nome;
  return `Comissão ${curto}${sufixo}`;
}

/** % de comissão do mês: o único usado, "% variável" se mudou no meio do mês, ou o de hoje. */
function rotuloPcts(pcts: number[], atual: number | null): string {
  if (pcts.length === 1) return `${pcts[0]}%`;
  if (pcts.length > 1) return "% variável";
  return atual != null ? `${atual}%` : "—";
}

function dicaComissao(pcts: number[], atual: number): string {
  return pcts.length > 1
    ? "Pelo % gravado em cada atendimento"
    : `${rotuloPcts(pcts, atual)} sobre o líquido de cada atendimento`;
}

export async function PaginaDona({
  professional,
  viewer,
  sp,
  agora,
}: {
  professional: Professional;
  viewer: Viewer;
  sp: SearchParams;
  agora: Date;
}) {
  const professionalId = professional.id;
  const tz = professional.timezone;

  // ── Estado da tela (URL) ──
  const mesAtual = monthKeyOf(agora, tz);
  const mesPedido = primeiro(sp.mes);
  const mes = isMonthKey(mesPedido) ? mesPedido : mesAtual;

  const team = await getTeam(professionalId);
  // Equipe ativa: filtro de profissional (só chaves de getTeam passam).
  const comEquipe = team.length > 1;
  const abaPedida = primeiro(sp.aba);

  // ── Dados: poucas consultas amplas; as contas são em memória ──
  await materializarDespesasFixas(professionalId, tz, agora);

  const { start, end } = monthRange(mes, tz);
  const chartKeys = Array.from({ length: 6 }, (_, i) => shiftMonthKey(mes, i - 5));
  const chartStart = monthRange(chartKeys[0], tz).start;

  // O extrato de comissão mostra cliente e serviço; as outras abas, não (menos idas ao banco).
  const querComissoes = abaPedida === "comissoes";
  const doMes = { professionalId, date: { gte: start, lt: end } };
  const txsComNomes = querComissoes ? await buscarLancamentosComNomes(doMes) : null;
  const txs: TxLeanRow[] = txsComNomes ?? (await buscarLancamentos(doMes));

  // Quem foi desativada mas teve recebimento no mês continua nas comissões e
  // no desempenho — mesmo que o estúdio tenha ficado sem equipe ativa.
  const equipeNoMes =
    comEquipe || txs.some((tx) => tx.type === "RECEITA" && tx.appointment?.memberId != null);
  const aba: Aba = isAba(abaPedida) && (abaPedida !== "comissoes" || equipeNoMes) ? abaPedida : "visao";

  const filtroUrl = comEquipe ? parseProFilter(primeiro(sp.prof), team) : ({ all: true } as const);
  const profUrl = filtroUrl.all ? ALL_KEY : filtroUrl.pro.key;
  // Comissões lista a equipe toda: lá o filtro não vale (mas segue na URL).
  const pro: TeamPro | null = aba !== "comissoes" && !filtroUrl.all ? filtroUrl.pro : null;

  const href = (estado: { mes?: string; aba?: Aba; prof?: string }, hash?: string) =>
    financeiroHref({ mes: estado.mes ?? mes, aba: estado.aba ?? aba, prof: estado.prof ?? profUrl }, mesAtual, hash);

  const agendadosNoMes = { professionalId, startAt: { gte: start, lt: end } };
  const [appts, apptsComNomes, metaCents, historico] = await Promise.all([
    aba === "visao" ? buscarAgendamentos(agendadosNoMes) : Promise.resolve([]),
    aba === "comissoes" ? buscarAgendamentosComNomes(agendadosNoMes) : Promise.resolve(null),
    buscarMeta(professionalId, mes),
    aba === "visao"
      ? buscarHistorico({
          professionalId,
          date: { gte: chartStart, lt: start },
          ...(pro ? { type: "RECEITA", appointment: { is: { memberId: pro.memberId } } } : {}),
        })
      : Promise.resolve([]),
  ]);

  const mesLabel = monthLabel(mes, tz);
  const todayKey = localDayKey(agora, tz);
  const inicioDeHoje = dayKeyToUtcStart(todayKey, tz);
  const mesPassado = end <= agora;
  const nomeDe = (p: Pick<TeamPro, "memberId" | "name">) => proLabel(p, viewer.memberId);

  // ── Cabeçalho, abas, período e filtro ──
  const abas: TabItem[] = [
    { key: "visao", label: "Visão geral", href: href({ aba: "visao" }) },
    { key: "lancamentos", label: "Lançamentos", href: href({ aba: "lancamentos" }) },
    ...(equipeNoMes ? [{ key: "comissoes", label: "Comissões", href: href({ aba: "comissoes" }) }] : []),
  ];

  const filtroOpcoes: ProFilterOption[] = [
    { key: ALL_KEY, label: "Estúdio todo", color: null, href: href({ prof: ALL_KEY }), selected: !pro },
    ...team.map((p) => ({
      key: p.key,
      label: nomeDe(p),
      color: p.color,
      href: href({ prof: p.key }),
      selected: pro?.key === p.key,
    })),
  ];

  let conteudo: React.ReactNode;

  if (aba === "lancamentos") {
    conteudo = (
      <AbaLancamentos
        txs={pro ? txs.filter((tx) => ehReceitaDa(tx, pro.memberId)) : txs}
        tz={tz}
        todayKey={todayKey}
        tagDe={(tx) => (equipeNoMes && !pro ? tagDaReceita(tx, team, viewer.memberId) : null)}
        filtrada={pro ? { nome: nomeDe(pro), isOwner: pro.isOwner } : null}
      />
    );
  } else if (aba === "comissoes") {
    // aba "comissoes" só existe se foi pedida: as duas listas com nomes foram buscadas.
    const txsExtrato = txsComNomes ?? [];
    const apptsExtrato = apptsComNomes ?? [];
    const funcionarias = profissionaisDoMes(team, txsExtrato, apptsExtrato).filter(
      (p): p is ProDoMes & { memberId: string } => !p.isOwner && p.memberId !== null,
    );
    const extratos = funcionarias
      .map((p) => ({ pro: p, extrato: extratoDaProfissional(p.memberId, txsExtrato, apptsExtrato) }))
      .filter(({ pro: p, extrato }) => p.ativa || extrato.linhas.length > 0 || extrato.aguardando.length > 0);
    const pagos = await buscarPagamentosDeComissao(
      professionalId,
      extratos.map(({ pro: p }) => descricaoPagamento(p.name, mesLabel)),
    );
    const data = (d: Date) => formatWithPattern(d, "dd/MM", tz);
    const membros: ComissaoMembro[] = extratos.map(({ pro: p, extrato }) => {
      const descricao = descricaoPagamento(p.name, mesLabel);
      return {
        key: p.key,
        name: p.name,
        initials: initials(p.name),
        color: p.color,
        inactive: !p.ativa,
        pctLabel: rotuloPcts(extrato.pcts, p.ativa ? p.commissionPct : null),
        atendimentos: extrato.linhas.length,
        recebidoCents: extrato.recebidoCents,
        comissaoCents: extrato.comissaoCents,
        pagoCents: pagos.get(descricao) ?? 0,
        descricaoPagamento: descricao,
        linhas: extrato.linhas.map((l) => ({
          id: l.appointmentId,
          dateLabel: data(l.startAt),
          clientName: l.clientName,
          serviceName: l.serviceName,
          recebidoCents: l.recebidoCents,
          comissaoCents: l.comissaoCents,
          faltaCents: l.faltaCents,
          href: `/atendimentos/${l.appointmentId}`,
        })),
        aguardando: extrato.aguardando.map((a) => ({
          id: a.appointmentId,
          dateLabel: data(a.startAt),
          clientName: a.clientName,
          serviceName: a.serviceName,
          pendenteCents: a.pendenteCents,
          href: `/atendimentos/${a.appointmentId}`,
        })),
      };
    });
    conteudo = <ComissoesPanel membros={membros} monthLabel={mesLabel} todayKey={todayKey} />;
  } else {
    // ── Visão geral ──
    let stats: StatItem[];
    if (pro) {
      const r = resumoProfissional(txs, appts, pro.memberId, inicioDeHoje);
      const nome = nomeDe(pro);
      const daPro = pro.isOwner ? "seus atendimentos" : `atendimentos de ${nome}`;
      stats = [
        {
          key: "recebido",
          label: "Recebido",
          value: formatBRL(r.recebidoCents),
          hint: `Dos ${daPro}, já sem as taxas`,
          tone: r.recebidoCents > 0 ? "success" : "ink",
        },
        {
          key: "comissao",
          label: "Comissão",
          value: formatBRL(r.comissaoCents),
          hint: pro.isOwner
            ? "Você não tem comissão: tudo fica no estúdio"
            : dicaComissao(r.pcts, pro.commissionPct),
        },
        {
          key: "fica",
          label: "Fica para o estúdio",
          value: formatSignedBRL(r.ficaCents),
          hint: "Recebido menos a comissão",
          tone: r.ficaCents > 0 ? "success" : r.ficaCents < 0 ? "danger" : "ink",
        },
        {
          key: "areceber",
          label: "A receber",
          value: formatBRL(r.aReceberCents),
          hint: mesPassado ? "O mês já acabou: nada mais a entrar" : "Horários marcados que ainda vão entrar",
        },
        {
          key: "atraso",
          label: "Em atraso",
          value: formatBRL(r.emAtrasoCents),
          hint: "Concluídos sem pagamento lançado",
          tone: r.emAtrasoCents > 0 ? "danger" : "ink",
        },
        {
          key: "saldo",
          label: "Saldo projetado",
          value: formatSignedBRL(r.saldoProjetadoCents),
          hint: pro.isOwner
            ? "Fica para o estúdio + o que falta entrar"
            : "Fica + o que falta entrar, já sem comissão",
          tone: r.saldoProjetadoCents < 0 ? "danger" : "ink",
        },
      ];
    } else {
      const r = resumoEstudio(txs, appts, inicioDeHoje);
      stats = [
        {
          key: "recebido",
          label: "Recebido",
          value: formatBRL(r.recebidoCents),
          hint: "Entradas do período, já sem as taxas",
          tone: r.recebidoCents > 0 ? "success" : "ink",
        },
        {
          key: "despesas",
          label: "Despesas pagas",
          value: formatBRL(r.despesasCents),
          hint: "Saídas lançadas no período",
          tone: r.despesasCents > 0 ? "danger" : "ink",
        },
        {
          key: "resultado",
          label: "Resultado de caixa",
          value: formatSignedBRL(r.resultadoCents),
          hint: "Recebido menos despesas pagas",
          tone: r.resultadoCents > 0 ? "success" : r.resultadoCents < 0 ? "danger" : "ink",
        },
        {
          key: "areceber",
          label: "A receber",
          value: formatBRL(r.aReceberCents),
          hint: mesPassado ? "O mês já acabou: nada mais a entrar" : "Horários marcados que ainda vão entrar",
        },
        {
          key: "atraso",
          label: "Em atraso",
          value: formatBRL(r.emAtrasoCents),
          hint: "Atendimentos concluídos sem pagamento lançado",
          tone: r.emAtrasoCents > 0 ? "danger" : "ink",
        },
        {
          key: "saldo",
          label: "Saldo projetado",
          value: formatSignedBRL(r.saldoProjetadoCents),
          hint: "Resultado + o que ainda falta entrar no mês",
          tone: r.saldoProjetadoCents < 0 ? "danger" : "ink",
        },
      ];
    }

    // Entradas x saídas (6 meses até o mês visto); com profissional, só as entradas dela.
    const doMes = pro ? txs.filter((tx) => ehReceitaDa(tx, pro.memberId)) : txs;
    const serie = serieMensal(chartKeys, [...historico, ...doMes], (d) => monthKeyOf(d, tz));
    const maior = Math.max(0, ...serie.map((m) => Math.max(m.entradasCents, pro ? 0 : m.saidasCents)));
    const eixo = escalaDoEixo(maior);
    const chartMonths: ChartMonth[] = serie.map((m) => ({
      key: m.key,
      label: monthShortLabel(m.key, tz),
      longLabel: monthLabel(m.key, tz),
      entradasCents: m.entradasCents,
      saidasCents: pro ? 0 : m.saidasCents,
    }));

    // Despesas por categoria (só Estúdio todo)
    const porCategoria = despesasPorCategoria(txs, CATEGORIAS);
    const totalDespesas = porCategoria.reduce((s, c) => s + c.cents, 0);
    const categorias: CategoriaItem[] = porCategoria.map((c) => ({
      key: c.key,
      label: EXPENSE_CATEGORIES[c.key as ExpenseCategory] ?? c.key,
      cents: c.cents,
      pct: totalDespesas > 0 ? (c.cents / totalDespesas) * 100 : 0,
    }));

    // Desempenho da equipe (com equipe ou movimento dela no mês, em Estúdio todo)
    const desempenho: DesempenhoItem[] =
      equipeNoMes && !pro
        ? desempenhoDaEquipe(profissionaisDoMes(team, txs, appts), txs, appts, inicioDeHoje).map((d) => ({
            key: d.pro.key,
            name: d.pro.name,
            label: d.pro.ativa ? nomeDe(d.pro) : firstName(d.pro.name),
            initials: initials(d.pro.name),
            color: d.pro.color,
            inactive: !d.pro.ativa,
            isOwner: d.pro.isOwner,
            href: d.pro.ativa ? href({ aba: "visao", prof: d.pro.key }, "filtros") : null,
            concluidos: d.concluidos,
            recebidoCents: d.recebidoCents,
            ticketMedioCents: d.ticketMedioCents,
            comissaoCents: d.comissaoCents,
            ficaCents: d.ficaCents,
          }))
        : [];

    const nomePro = pro ? nomeDe(pro) : null;

    conteudo = (
      <div className="@container space-y-4">
        <StatGrid items={stats} />

        {!pro ? (
          <GoalCard
            monthKey={mes}
            monthLabel={mesLabel}
            targetCents={metaCents}
            netCents={txs.reduce((s, tx) => (tx.type === "RECEITA" ? s + tx.netCents : s), 0)}
          />
        ) : null}

        <div className={pro ? "grid gap-4" : "grid gap-4 @2xl:grid-cols-2"}>
          <BarChart
            title={pro ? (pro.isOwner ? "Suas entradas" : `Entradas de ${nomePro}`) : "Entradas x saídas"}
            description={
              pro
                ? "Recebido dos atendimentos, mês a mês, já sem as taxas"
                : "Fluxo de caixa realizado nos últimos 6 meses"
            }
            months={chartMonths}
            ticks={eixo.ticks.map((cents) => ({ cents, label: formatBRLCompact(cents) }))}
            topCents={eixo.topo}
            focusKey={mes}
            series={pro ? "entradas" : "fluxo"}
            emptyText={
              pro
                ? "Quando entrarem pagamentos dos atendimentos, as barras aparecem aqui."
                : "Quando entrarem recebimentos e despesas, o fluxo dos meses aparece aqui."
            }
          />
          {!pro ? (
            <CategoriasCard monthLabel={mesLabel} items={categorias} totalCents={totalDespesas} />
          ) : null}
        </div>

        {desempenho.length > 0 ? <DesempenhoCard items={desempenho} monthLabel={mesLabel} /> : null}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Caixa, recebimentos, despesas e desempenho em um só lugar."
        action={
          <HeaderActions
            monthKey={mes}
            monthLabel={mesLabel}
            goalTargetCents={metaCents}
            todayKey={todayKey}
            abrirDespesa={primeiro(sp.despesa) === "1"}
          />
        }
      />

      <Tabs items={abas} value={aba} ariaLabel="Seções do financeiro" />

      <div id="filtros" className="mt-4 mb-5 scroll-mt-4 space-y-3">
        <PeriodBar
          label={mesLabel}
          prevHref={href({ mes: shiftMonthKey(mes, -1) })}
          nextHref={href({ mes: shiftMonthKey(mes, 1) })}
          thisMonthHref={href({ mes: mesAtual })}
          isCurrent={mes === mesAtual}
        />
        {comEquipe && aba !== "comissoes" ? <ProFilter options={filtroOpcoes} /> : null}
      </div>

      <div role="tabpanel" aria-label={abas.find((a) => a.key === aba)?.label}>
        {conteudo}
      </div>
    </>
  );
}

/** Quem atendeu uma receita (lista de lançamentos com equipe, em Estúdio todo). */
function tagDaReceita(tx: TxLeanRow, team: TeamPro[], viewerMemberId: string | null): ProTag | null {
  if (tx.type !== "RECEITA" || !tx.appointment) return null;
  const memberId = tx.appointment.memberId;
  const pro = team.find((p) => p.memberId === memberId);
  if (pro) return { label: proLabel(pro, viewerMemberId), color: pro.color };
  const member = tx.appointment.member;
  return member ? { label: firstName(member.name), color: member.color } : null;
}

function AbaLancamentos({
  txs,
  tz,
  todayKey,
  tagDe,
  filtrada,
}: {
  txs: TxLeanRow[];
  tz: string;
  todayKey: string;
  tagDe: (tx: TxLeanRow) => ProTag | null;
  /** Profissional filtrada (só os recebimentos dela). */
  filtrada: { nome: string; isOwner: boolean } | null;
}) {
  const items: LancamentoItem[] = txs.map((t) => ({
    id: t.id,
    type: t.type === "DESPESA" ? "DESPESA" : "RECEITA",
    kind: t.kind === "SINAL" || t.kind === "ATENDIMENTO" ? t.kind : "OUTRO",
    description: t.description,
    category: t.category && t.category in EXPENSE_CATEGORIES ? (t.category as ExpenseCategory) : null,
    method: t.method,
    amountCents: t.amountCents,
    netCents: t.netCents,
    dateLabel: formatWithPattern(t.date, "dd/MM", tz),
    dateKey: localDayKey(t.date, tz),
    recurrence: t.recurrence === "FIXA_MENSAL" ? "FIXA_MENSAL" : "AVULSA",
    appointmentId: t.appointmentId,
    pro: tagDe(t),
  }));

  const entradas = items.filter((i) => i.type === "RECEITA").reduce((s, i) => s + i.netCents, 0);
  const saidas = items.filter((i) => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);

  const titulo = filtrada
    ? filtrada.isOwner
      ? "Seus recebimentos"
      : `Recebimentos de ${filtrada.nome}`
    : "Lançamentos";

  return (
    <section aria-label={titulo}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">{titulo}</h2>
        {items.length > 0 ? (
          <p className="text-[13px] tabular-nums text-ink-soft">
            {plural(items.length, "lançamento", "lançamentos")} · entrou {formatBRL(entradas)}
            {filtrada ? "" : ` · saiu ${formatBRL(saidas)}`}
          </p>
        ) : null}
      </div>
      <LancamentosList
        items={items}
        todayKey={todayKey}
        {...(filtrada
          ? {
              emptyTitle: "Nenhum recebimento neste mês",
              emptyText: filtrada.isOwner
                ? "Pagamentos dos seus atendimentos entram aqui quando forem lançados na ficha."
                : `Pagamentos dos atendimentos de ${filtrada.nome} entram aqui quando forem lançados na ficha.`,
            }
          : {})}
      />
    </section>
  );
}
