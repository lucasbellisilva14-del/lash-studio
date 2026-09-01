/**
 * Relatórios — consultas agregadas e cálculos de insight.
 * Multi-tenant: TODA consulta filtra por professionalId.
 * Sem N+1: último atendimento por cliente via distinct, somas via groupBy.
 */
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
};

type ProfessionalSettings = {
  id: string;
  timezone: string;
  maintenanceLimitDays: number;
  inactiveDays: number;
};

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

export async function getRelatoriosData(
  professional: ProfessionalSettings,
  periodo: PeriodoRelatorio,
): Promise<RelatoriosData> {
  const tz = professional.timezone;
  const now = new Date();
  // Janela de N dias terminando no fim do dia local de hoje.
  const fimPeriodo = addDays(dayKeyToUtcStart(localDayKey(now, tz), tz), 1);
  const inicioPeriodo = addDays(fimPeriodo, -periodo);

  const [clients, lastLashRows, revenueByClient, doneByClient, periodDone, demandaAppts, services] =
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
      prisma.transaction.groupBy({
        by: ["clientId"],
        where: { professionalId: professional.id, type: "RECEITA", clientId: { not: null } },
        _sum: { netCents: true },
      }),
      // Nº de atendimentos concluídos por cliente (todo o histórico).
      prisma.appointment.groupBy({
        by: ["clientId"],
        where: { professionalId: professional.id, status: "CONCLUIDO" },
        _count: { _all: true },
      }),
      // Atendimentos concluídos no período — serviços mais vendidos.
      prisma.appointment.findMany({
        where: {
          professionalId: professional.id,
          status: "CONCLUIDO",
          startAt: { gte: inicioPeriodo, lt: fimPeriodo },
        },
        select: { id: true, serviceId: true },
      }),
      // Demanda no período: concluídos + confirmados.
      prisma.appointment.findMany({
        where: {
          professionalId: professional.id,
          status: { in: ["CONCLUIDO", "CONFIRMADO"] },
          startAt: { gte: inicioPeriodo, lt: fimPeriodo },
        },
        select: { startAt: true },
      }),
      prisma.service.findMany({
        where: { professionalId: professional.id },
        select: { id: true, name: true },
      }),
    ]);

  // Receita associada aos atendimentos do período (SINAL + ATENDIMENTO, sem duplicar).
  const periodTx = periodDone.length
    ? await prisma.transaction.findMany({
        where: {
          professionalId: professional.id,
          type: "RECEITA",
          appointmentId: { in: periodDone.map((a) => a.id) },
        },
        select: { appointmentId: true, netCents: true },
      })
    : [];

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
  for (const c of clients) {
    const cycle = computeClientCycle(lastLashByClient.get(c.id) ?? null, cycleSettings, now);
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
  const doneCountByClient = new Map(doneByClient.map((r) => [r.clientId, r._count._all]));
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
    campeao = `${WEEKDAYS_PT[wd]} ${TURNOS[turno]} é seu horário mais forte`;
  }
  const demanda: DemandaData = { total: demandaAppts.length, porDia, porFaixa, campeao };

  // ── 5. Origem das clientes ──────────────────────────────────────────────
  const revenueByClientId = new Map<string, number>();
  for (const r of revenueByClient) {
    if (r.clientId) revenueByClientId.set(r.clientId, r._sum.netCents ?? 0);
  }
  const origemAgg = new Map<string, { count: number; netCents: number }>();
  for (const c of clients) {
    const key = c.source == null ? "NAO_INFORMADO" : c.source in CLIENT_SOURCES ? c.source : "OUTRO";
    const agg = origemAgg.get(key) ?? { count: 0, netCents: 0 };
    agg.count += 1;
    agg.netCents += revenueByClientId.get(c.id) ?? 0;
    origemAgg.set(key, agg);
  }
  const totalClientes = clients.length;
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
    origemInsight =
      melhor.netCents > 0
        ? `${melhor.label} trouxe ${clientesTxt} e ${formatBRL(melhor.netCents)} — seu melhor canal.`
        : `${melhor.label} trouxe ${clientesTxt} — seu melhor canal.`;
  }

  return { statusGroups, ltv, servicos, demanda, origens, origemInsight };
}
