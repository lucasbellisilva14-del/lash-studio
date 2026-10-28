/**
 * Relatórios — consultas agregadas e cálculos de insight.
 * Multi-tenant: TODA consulta filtra por professionalId.
 * Sem N+1: último atendimento por cliente via distinct, somas via groupBy.
 * Produção com connection_limit=1: poucas consultas amplas, contas em memória
 * (nada de uma consulta por profissional ou por dia).
 *
 * Equipe (memberId nulo = a dona). Com uma profissional filtrada: serviços e
 * demanda olham os agendamentos dela; o LTV, a receita das transações ligadas
 * a agendamentos dela; status e origem, as clientes que ela já atendeu
 * (CONCLUIDO com ela, qualquer época). Indicadores em ./indicadores.
 */
import "server-only";
import { cache } from "react";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  CLIENT_SOURCES,
  LASH_CYCLE_CATEGORIES,
  WEEKDAYS_PT,
  type ClientSource,
  type ClientStatus,
} from "@/lib/constants";
import { computeClientCycle } from "@/lib/domain/client-status";
import {
  dayKeyToUtcStart,
  localDayKey,
  localTimeOf,
  localWeekday,
  timeToMinutes,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { blockScopeFor, getTeam } from "@/lib/team";
import type { TeamPro } from "@/lib/team-shared";
import { apptSelectLean, buscarLancamentosComNomes } from "@/app/(app)/financeiro/data";
import {
  indicadoresDasProfissionais,
  type BaseDosIndicadores,
  type Indicadores,
  type Janela,
} from "./indicadores";

export type PeriodoRelatorio = 30 | 90 | 365;

export type ClienteStatusItem = {
  id: string;
  name: string;
  phone: string;
  daysSinceLast: number | null;
};

export type StatusGroupData = {
  status: ClientStatus;
  clientes: ClienteStatusItem[];
};

export type LtvItem = {
  clientId: string;
  name: string;
  netCents: number;
  doneCount: number;
};

export type ServicoItem = {
  serviceId: string;
  name: string;
  count: number;
  netCents: number;
};

export type DemandaData = {
  total: number;
  /** Contagem por dia da semana (0 = domingo .. 6 = sábado). */
  porDia: number[];
  porFaixa: { label: string; count: number }[];
  /** Frase pronta, sem ponto final (ex.: "Sábado de manhã é seu horário mais forte"). */
  campeao: string | null;
};

export type OrigemItem = {
  key: string;
  label: string;
  count: number;
  pct: number;
  netCents: number;
};

export type RelatoriosData = {
  statusGroups: StatusGroupData[];
  ltv: LtvItem[];
  servicos: ServicoItem[];
  demanda: DemandaData;
  origens: OrigemItem[];
  origemInsight: string | null;
  /** Indicadores das profissionais pedidas (chave = memberId; nulo = a dona). Vazio sem equipe. */
  indicadores: Map<string | null, Indicadores>;
};

type ProfessionalSettings = {
  id: string;
  timezone: string;
  maintenanceLimitDays: number;
  inactiveDays: number;
};

/** Profissional filtrada nos relatórios. */
export type FiltroRelatorio = {
  memberId: string | null;
  /** Nome curto para as frases ("o horário mais forte de Ana"); nulo = "seu". */
  nome: string | null;
};

/** Profissional nas opções de filtro: a equipe ativa + quem saiu mas teve movimento no período. */
export type ProRelatorio = TeamPro & { ativa: boolean };

const STATUS_ORDER: ClientStatus[] = ["ATIVA", "EM_RISCO", "INATIVA", "SEM_HISTORICO"];

/** Faixas de hora local exibidas no gráfico de demanda. */
const FAIXAS_HORA = [
  { label: "8–10h", from: 8 * 60, to: 10 * 60 },
  { label: "10–12h", from: 10 * 60, to: 12 * 60 },
  { label: "12–14h", from: 12 * 60, to: 14 * 60 },
  { label: "14–16h", from: 14 * 60, to: 16 * 60 },
  { label: "16–18h", from: 16 * 60, to: 18 * 60 },
  { label: "18–20h", from: 18 * 60, to: 20 * 60 },
] as const;

const TURNOS = ["de manhã", "à tarde", "à noite"] as const;

/** Janela de N dias terminando no fim do dia local de hoje. */
export function janelaDoPeriodo(periodo: PeriodoRelatorio, tz: string, agora: Date): Janela {
  const fim = addDays(dayKeyToUtcStart(localDayKey(agora, tz), tz), 1);
  return { inicio: addDays(fim, -periodo), fim };
}

/**
 * Profissionais para o filtro: a dona, a equipe ativa e quem foi desativada
 * mas teve agendamento na janela (com `recebimentos`, também quem teve receita
 * de atendimento lançada nela — o fechamento paga a comissão de quem saiu).
 * Mais de uma = o estúdio tem (ou teve, no período) equipe.
 * Datas em ms para o cache da requisição (página + metadata) funcionar.
 */
export const profissionaisDoPeriodo = cache(
  async (
    professionalId: string,
    inicioMs: number,
    fimMs: number,
    recebimentos: boolean,
  ): Promise<ProRelatorio[]> => {
    const periodo = { gte: new Date(inicioMs), lt: new Date(fimMs) };
    const [team, desativadas] = await Promise.all([
      getTeam(professionalId),
      prisma.teamMember.findMany({
        where: {
          professionalId,
          active: false,
          OR: [
            { appointments: { some: { professionalId, startAt: periodo } } },
            ...(recebimentos
              ? [
                  {
                    appointments: {
                      some: {
                        professionalId,
                        transactions: { some: { professionalId, type: "RECEITA", date: periodo } },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, color: true },
      }),
    ]);
    return [
      ...team.map((p) => ({ ...p, ativa: true })),
      ...desativadas.map((m) => ({
        key: m.id,
        memberId: m.id,
        name: m.name,
        color: m.color,
        isOwner: false,
        bookableOnline: false,
        commissionPct: 0,
        ativa: false,
      })),
    ];
  },
);

/**
 * Expediente do estúdio, bloqueios que cruzam a janela e clientes que voltaram
 * depois dela ou têm horário futuro. `memberId` definido = só o que vale para
 * essa profissional (consultas menores); indefinido = o estúdio todo.
 */
export async function buscarBaseDosIndicadores(
  professionalId: string,
  janela: Janela,
  agora: Date,
  memberId?: string | null,
): Promise<BaseDosIndicadores> {
  const fimOcupacao = agora < janela.fim ? agora : janela.fim;
  const [expedientes, bloqueios, retornos] = await Promise.all([
    prisma.workingHour.findMany({
      where: { professionalId },
      select: { weekday: true, startTime: true, endTime: true, active: true },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        professionalId,
        AND: [
          ...(memberId !== undefined ? [blockScopeFor(memberId)] : []),
          {
            OR: [
              { type: "SEMANAL" },
              { type: "AVULSO", startAt: { lt: fimOcupacao }, endAt: { gt: janela.inicio } },
            ],
          },
        ],
      },
      select: {
        type: true,
        startAt: true,
        endAt: true,
        weekday: true,
        startTime: true,
        endTime: true,
        memberId: true,
        allTeam: true,
      },
    }),
    prisma.appointment.groupBy({
      by: ["clientId", "memberId"],
      where: {
        professionalId,
        ...(memberId !== undefined ? { memberId } : {}),
        OR: [
          { status: "CONCLUIDO", startAt: { gte: janela.fim } },
          { status: { in: ["CONFIRMADO", "PRE_AGENDADO"] }, startAt: { gte: agora } },
        ],
      },
    }),
  ]);
  return { expedientes, bloqueios, retornos };
}

export async function getRelatoriosData(
  professional: ProfessionalSettings,
  janela: Janela,
  opts: {
    agora: Date;
    /** Profissional filtrada; null = estúdio todo. */
    filtro: FiltroRelatorio | null;
    /** De quem calcular os indicadores (memberId; nulo = a dona). Vazio = nenhum (sem equipe). */
    indicadoresPara: (string | null)[];
  },
): Promise<RelatoriosData> {
  const tz = professional.timezone;
  const { agora, filtro } = opts;
  const { inicio: inicioPeriodo, fim: fimPeriodo } = janela;
  /** Só os agendamentos da profissional filtrada (nada, sem filtro). */
  const daPro = filtro ? { memberId: filtro.memberId } : {};
  const indicadoresPara = opts.indicadoresPara;

  const [clients, lastLashRows, revenueByClient, doneByClient, periodAppts, periodTx, services, base] =
    await Promise.all([
      prisma.client.findMany({
        where: { professionalId: professional.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, phone: true, source: true },
      }),
      // Último atendimento de cílios CONCLUÍDO por cliente, numa única query
      // (distinct + orderBy desc → 1ª linha de cada cliente é a mais recente).
      prisma.appointment.findMany({
        where: {
          professionalId: professional.id,
          status: "CONCLUIDO",
          service: { category: { in: [...LASH_CYCLE_CATEGORIES] } },
        },
        orderBy: { startAt: "desc" },
        distinct: ["clientId"],
        select: { clientId: true, startAt: true },
      }),
      // Receita líquida total por cliente (todo o histórico) — LTV e origem.
      // Com profissional: só as transações ligadas a agendamentos dela.
      prisma.transaction.groupBy({
        by: ["clientId"],
        where: {
          professionalId: professional.id,
          type: "RECEITA",
          clientId: { not: null },
          ...(filtro ? { appointment: { is: daPro } } : {}),
        },
        _sum: { netCents: true },
      }),
      // Nº de atendimentos concluídos por cliente (todo o histórico), por profissional.
      prisma.appointment.groupBy({
        by: ["clientId", "memberId"],
        where: { professionalId: professional.id, status: "CONCLUIDO", ...daPro },
        _count: { _all: true },
      }),
      // Agendamentos do período (qualquer status): serviços, demanda e indicadores.
      prisma.appointment.findMany({
        where: {
          professionalId: professional.id,
          startAt: { gte: inicioPeriodo, lt: fimPeriodo },
          ...daPro,
        },
        select: {
          id: true,
          clientId: true,
          serviceId: true,
          memberId: true,
          status: true,
          startAt: true,
          endAt: true,
        },
      }),
      // Receita associada aos atendimentos concluídos do período (SINAL + ATENDIMENTO, sem duplicar).
      prisma.transaction.findMany({
        where: {
          professionalId: professional.id,
          type: "RECEITA",
          appointment: {
            is: {
              professionalId: professional.id,
              status: "CONCLUIDO",
              startAt: { gte: inicioPeriodo, lt: fimPeriodo },
              ...daPro,
            },
          },
        },
        select: { appointmentId: true, netCents: true },
      }),
      prisma.service.findMany({
        where: { professionalId: professional.id },
        select: { id: true, name: true },
      }),
      indicadoresPara.length > 0
        ? buscarBaseDosIndicadores(
            professional.id,
            janela,
            agora,
            indicadoresPara.length === 1 ? indicadoresPara[0] : undefined,
          )
        : Promise.resolve(null),
    ]);

  const periodDone = periodAppts.filter((a) => a.status === "CONCLUIDO");
  const demandaAppts = periodAppts.filter((a) => a.status === "CONCLUIDO" || a.status === "CONFIRMADO");
  /** " de Ana" nas frases de insight (a dona e o estúdio todo ficam com "seu"). */
  const deQuem = filtro?.nome ? ` de ${filtro.nome}` : null;

  // Concluídos por cliente: os dela, com filtro; de todas, sem.
  const doneCountByClient = new Map<string, number>();
  for (const r of doneByClient) {
    doneCountByClient.set(r.clientId, (doneCountByClient.get(r.clientId) ?? 0) + r._count._all);
  }
  // Com filtro, status e origem olham só as clientes que ela já atendeu.
  const clientesBase = filtro ? clients.filter((c) => doneCountByClient.has(c.id)) : clients;

  // ── 1. Clientes por status ──────────────────────────────────────────────
  const lastLashByClient = new Map(lastLashRows.map((r) => [r.clientId, r.startAt]));
  const cycleSettings = {
    maintenanceLimitDays: professional.maintenanceLimitDays,
    inactiveDays: professional.inactiveDays,
    timezone: tz,
  };
  const porStatus: Record<ClientStatus, ClienteStatusItem[]> = {
    ATIVA: [],
    EM_RISCO: [],
    INATIVA: [],
    SEM_HISTORICO: [],
  };
  for (const c of clientesBase) {
    const cycle = computeClientCycle(lastLashByClient.get(c.id) ?? null, cycleSettings, agora);
    porStatus[cycle.status].push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      daysSinceLast: cycle.daysSinceLast,
    });
  }
  // Ativas: mais recentes primeiro. Em risco/inativas: há mais tempo sem atendimento primeiro.
  porStatus.ATIVA.sort((a, b) => (a.daysSinceLast ?? 0) - (b.daysSinceLast ?? 0));
  porStatus.EM_RISCO.sort((a, b) => (b.daysSinceLast ?? 0) - (a.daysSinceLast ?? 0));
  porStatus.INATIVA.sort((a, b) => (b.daysSinceLast ?? 0) - (a.daysSinceLast ?? 0));
  const statusGroups: StatusGroupData[] = STATUS_ORDER.map((status) => ({
    status,
    clientes: porStatus[status],
  }));

  // ── 2. Ranking LTV (todo o histórico) ───────────────────────────────────
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const ltv: LtvItem[] = revenueByClient
    .flatMap((r) => {
      const netCents = r._sum.netCents ?? 0;
      const name = r.clientId ? nameById.get(r.clientId) : undefined;
      if (!r.clientId || !name || netCents <= 0) return [];
      return [
        {
          clientId: r.clientId,
          name,
          netCents,
          doneCount: doneCountByClient.get(r.clientId) ?? 0,
        },
      ];
    })
    .sort((a, b) => b.netCents - a.netCents)
    .slice(0, 10);

  // ── 3. Serviços mais vendidos (período) ─────────────────────────────────
  const txByAppointment = new Map<string, number>();
  for (const t of periodTx) {
    if (!t.appointmentId) continue;
    txByAppointment.set(t.appointmentId, (txByAppointment.get(t.appointmentId) ?? 0) + t.netCents);
  }
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));
  const porServico = new Map<string, { count: number; netCents: number }>();
  for (const a of periodDone) {
    const agg = porServico.get(a.serviceId) ?? { count: 0, netCents: 0 };
    agg.count += 1;
    agg.netCents += txByAppointment.get(a.id) ?? 0;
    porServico.set(a.serviceId, agg);
  }
  const servicos: ServicoItem[] = [...porServico.entries()]
    .map(([serviceId, agg]) => ({
      serviceId,
      name: serviceNameById.get(serviceId) ?? "Serviço removido",
      count: agg.count,
      netCents: agg.netCents,
    }))
    .sort((a, b) => b.netCents - a.netCents || b.count - a.count);

  // ── 4. Dias e horários mais procurados (período) ────────────────────────
  const porDia = Array.from({ length: 7 }, () => 0);
  const porFaixa = FAIXAS_HORA.map((f) => ({ label: f.label, count: 0 }));
  const porCombo = new Map<string, number>();
  for (const a of demandaAppts) {
    const wd = localWeekday(a.startAt, tz);
    porDia[wd] += 1;
    const min = timeToMinutes(localTimeOf(a.startAt, tz));
    const idx = FAIXAS_HORA.findIndex((f) => min >= f.from && min < f.to);
    if (idx >= 0) porFaixa[idx].count += 1;
    const turno = min < 12 * 60 ? 0 : min < 18 * 60 ? 1 : 2;
    const combo = `${wd}-${turno}`;
    porCombo.set(combo, (porCombo.get(combo) ?? 0) + 1);
  }
  let campeao: string | null = null;
  let melhorCombo: string | null = null;
  let melhorContagem = 0;
  for (const [combo, count] of porCombo) {
    if (count > melhorContagem) {
      melhorContagem = count;
      melhorCombo = combo;
    }
  }
  if (melhorCombo) {
    const [wd, turno] = melhorCombo.split("-").map(Number);
    campeao = deQuem
      ? `${WEEKDAYS_PT[wd]} ${TURNOS[turno]} é o horário mais forte${deQuem}`
      : `${WEEKDAYS_PT[wd]} ${TURNOS[turno]} é seu horário mais forte`;
  }
  const demanda: DemandaData = { total: demandaAppts.length, porDia, porFaixa, campeao };

  // ── 5. Origem das clientes ──────────────────────────────────────────────
  const revenueByClientId = new Map<string, number>();
  for (const r of revenueByClient) {
    if (r.clientId) revenueByClientId.set(r.clientId, r._sum.netCents ?? 0);
  }
  const origemAgg = new Map<string, { count: number; netCents: number }>();
  for (const c of clientesBase) {
    const key = c.source == null ? "NAO_INFORMADO" : c.source in CLIENT_SOURCES ? c.source : "OUTRO";
    const agg = origemAgg.get(key) ?? { count: 0, netCents: 0 };
    agg.count += 1;
    agg.netCents += revenueByClientId.get(c.id) ?? 0;
    origemAgg.set(key, agg);
  }
  const totalClientes = clientesBase.length;
  const origens: OrigemItem[] = [...Object.keys(CLIENT_SOURCES), "NAO_INFORMADO"]
    .map((key) => {
      const agg = origemAgg.get(key) ?? { count: 0, netCents: 0 };
      return {
        key,
        label: key === "NAO_INFORMADO" ? "Não informado" : CLIENT_SOURCES[key as ClientSource],
        count: agg.count,
        pct: totalClientes > 0 ? Math.round((agg.count / totalClientes) * 100) : 0,
        netCents: agg.netCents,
      };
    })
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count || b.netCents - a.netCents);

  const conhecidas = origens.filter((o) => o.key !== "NAO_INFORMADO");
  let origemInsight: string | null = null;
  if (conhecidas.length > 0) {
    const melhor = [...conhecidas].sort(
      (a, b) => b.netCents - a.netCents || b.count - a.count,
    )[0];
    const clientesTxt = melhor.count === 1 ? "1 cliente" : `${melhor.count} clientes`;
    const canal = deQuem ? `o melhor canal${deQuem}` : "seu melhor canal";
    origemInsight =
      melhor.netCents > 0
        ? `${melhor.label} trouxe ${clientesTxt} e ${formatBRL(melhor.netCents)} — ${canal}.`
        : `${melhor.label} trouxe ${clientesTxt} — ${canal}.`;
  }

  // ── 6. Indicadores por profissional (só com equipe) ─────────────────────
  const indicadores = base
    ? indicadoresDasProfissionais({
        memberIds: indicadoresPara,
        agendamentos: periodAppts,
        base,
        janela,
        agora,
        tz,
      })
    : new Map<string | null, Indicadores>();

  return { statusGroups, ltv, servicos, demanda, origens, origemInsight, indicadores };
}

/**
 * Fechamento do mês de uma profissional: receitas do mês ligadas a
 * agendamentos dela (a base da comissão, com cliente e serviço), os
 * agendamentos dela no mês (qualquer status: extrato e indicadores) e a base
 * dos indicadores.
 */
export async function buscarFechamentoDaProfissional(
  professionalId: string,
  janela: Janela,
  agora: Date,
  memberId: string | null,
) {
  const [txs, appts, base] = await Promise.all([
    buscarLancamentosComNomes({
      professionalId,
      type: "RECEITA",
      date: { gte: janela.inicio, lt: janela.fim },
      appointment: { is: { memberId } },
    }),
    prisma.appointment.findMany({
      where: { professionalId, memberId, startAt: { gte: janela.inicio, lt: janela.fim } },
      orderBy: { startAt: "asc" },
      select: { ...apptSelectLean, clientId: true, endAt: true },
    }),
    buscarBaseDosIndicadores(professionalId, janela, agora, memberId),
  ]);
  return { txs, appts, base };
}
