import type { Metadata } from "next";
import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { requireProfessional, requireViewer } from "@/lib/session";
import { appointmentScope, clientScope, getTeam } from "@/lib/team";
import {
  ALL_KEY,
  OWNER_KEY,
  TEAM_COLORS,
  parseProFilter,
  proForMember,
  type ProFilter,
} from "@/lib/team-shared";
import { dayKeyToUtcStart, formatWithPattern, localDayKey, localWeekday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { rotulosDaEquipe, toAgendaPros } from "@/components/agenda/pro";
import type {
  AgendaCompromisso,
  AgendaConfig,
  VisaoAgenda,
} from "@/components/agenda/types";
import {
  getClientesAgenda,
  getCompromissosNoIntervalo,
  getGradeAgenda,
  getServicosAtivos,
  toAgendaBloqueio,
  toHorarioFuncionamento,
} from "./data";
import { BLOCKING_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Agenda" };

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shiftDia(key: string, dias: number, tz: string): string {
  return localDayKey(addDays(dayKeyToUtcStart(key, tz), dias), tz);
}

/** Primeiro dia do mês deslocado `delta` meses (chave yyyy-MM-01). */
function shiftMes(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export default async function AgendaPage(props: PageProps<"/agenda">) {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const tz = professional.timezone;
  const hojeKey = localDayKey(new Date(), tz);
  const team = await getTeam(professional.id);
  const comEquipe = team.length > 1;

  // Filtro de profissional (?prof=). A dona com equipe começa em "todas"; a
  // funcionária vê sempre só a própria agenda (o parâmetro é ignorado).
  let filtro: ProFilter;
  if (!viewer.isOwner) {
    const eu = proForMember(team, viewer.memberId) ?? {
      key: viewer.memberId ?? OWNER_KEY,
      memberId: viewer.memberId,
      name: viewer.name,
      color: TEAM_COLORS[0],
      isOwner: false,
      bookableOnline: false,
      commissionPct: 0,
    };
    filtro = { all: false, pro: eu };
  } else {
    filtro = comEquipe ? parseProFilter(primeiro(sp.prof), team) : { all: true };
  }
  const escopoAgendamentos: Prisma.AppointmentWhereInput = !viewer.isOwner
    ? appointmentScope(viewer)
    : filtro.all
      ? {}
      : { memberId: filtro.pro.memberId };
  /** Vai em todos os links da agenda; nulo = "todas" (padrão) ou sem filtro. */
  const prof = viewer.isOwner && !filtro.all ? filtro.pro.key : null;

  const rawVisao = primeiro(sp.visao);
  const visao: VisaoAgenda =
    rawVisao === "semana" || rawVisao === "mes" ? rawVisao : "dia";
  const rawDia = primeiro(sp.dia);
  const diaKey =
    rawDia && /^\d{4}-\d{2}-\d{2}$/.test(rawDia) ? rawDia : hojeKey;
  const novoInicial = primeiro(sp.novo) === "1";
  const clienteInicialId = primeiro(sp.cliente) || null;

  const [{ workingHours, blocks }, clientes, servicos] = await Promise.all([
    getGradeAgenda(professional.id, filtro.all ? "todas" : { memberId: filtro.pro.memberId }),
    getClientesAgenda(professional.id, clientScope(viewer)),
    getServicosAtivos(professional.id),
  ]);

  // Em "todas", bloqueios de quem saiu da equipe não interessam mais.
  const ativas = new Set(team.map((p) => p.memberId));
  const blocksVisiveis = filtro.all
    ? blocks.filter((b) => b.allTeam || ativas.has(b.memberId))
    : blocks;
  // Com equipe em "todas", o bloqueio de uma pessoa diz de quem é.
  const rotulos = rotulosDaEquipe(team, viewer.memberId);
  const bloqueios = blocksVisiveis.map((b) =>
    toAgendaBloqueio(
      b,
      comEquipe && filtro.all && !b.allTeam
        ? (rotulos.get(b.memberId ?? OWNER_KEY) ?? null)
        : null,
    ),
  );

  // Grade do mês do dia aberto (semana começa na segunda): alimenta o mini
  // calendário do PC, a faixa da semana do celular e a visão Mês.
  const primeiroDoMesKey = `${diaKey.slice(0, 7)}-01`;
  const [ano, mesNum] = primeiroDoMesKey.split("-").map(Number);
  const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const offsetMes = (localWeekday(dayKeyToUtcStart(primeiroDoMesKey, tz), tz) + 6) % 7;
  const totalCelulas = Math.ceil((offsetMes + diasNoMes) / 7) * 7;
  const chaves: string[] = [];
  let cursor = addDays(dayKeyToUtcStart(primeiroDoMesKey, tz), -offsetMes);
  for (let i = 0; i < totalCelulas; i++) {
    chaves.push(localDayKey(cursor, tz));
    cursor = addDays(cursor, 1);
  }
  const gridStart = dayKeyToUtcStart(chaves[0], tz);
  const gridEnd = addDays(dayKeyToUtcStart(chaves[chaves.length - 1], tz), 1);

  // Semana do dia aberto (seg → dom)
  const offsetSemana = (localWeekday(dayKeyToUtcStart(diaKey, tz), tz) + 6) % 7;
  const inicioSemanaKey = shiftDia(diaKey, -offsetSemana, tz);
  const semana = Array.from({ length: 7 }, (_, i) => shiftDia(inicioSemanaKey, i, tz));

  // Navegação e dados por visão
  const donaNome = team[0]?.name ?? professional.name;
  let anteriorKey: string;
  let proximoKey: string;
  let compromissos: AgendaCompromisso[] = [];

  if (visao === "dia") {
    anteriorKey = shiftDia(diaKey, -1, tz);
    proximoKey = shiftDia(diaKey, 1, tz);
    const start = dayKeyToUtcStart(diaKey, tz);
    compromissos = await getCompromissosNoIntervalo(
      professional.id,
      start,
      addDays(start, 1),
      escopoAgendamentos,
      donaNome,
    );
  } else if (visao === "semana") {
    anteriorKey = shiftDia(diaKey, -7, tz);
    proximoKey = shiftDia(diaKey, 7, tz);
    const start = dayKeyToUtcStart(inicioSemanaKey, tz);
    compromissos = await getCompromissosNoIntervalo(
      professional.id,
      start,
      addDays(start, 7),
      escopoAgendamentos,
      donaNome,
    );
  } else {
    anteriorKey = shiftMes(diaKey, -1);
    proximoKey = shiftMes(diaKey, 1);
    // A grade inteira: alimenta os pontos E a lista do dia selecionado.
    compromissos = await getCompromissosNoIntervalo(
      professional.id,
      gridStart,
      gridEnd,
      escopoAgendamentos,
      donaNome,
    );
  }

  // Contagem por dia na grade (pontos do calendário e da faixa da semana),
  // sempre dentro do filtro de profissional.
  const inicios =
    visao === "mes"
      ? compromissos
          .filter((c) => (BLOCKING_STATUSES as readonly string[]).includes(c.status))
          .map((c) => new Date(c.inicio))
      : (
          await prisma.appointment.findMany({
            where: {
              professionalId: professional.id,
              AND: [escopoAgendamentos],
              startAt: { gte: gridStart, lt: gridEnd },
              status: { in: [...BLOCKING_STATUSES] },
            },
            select: { startAt: true },
          })
        ).map((a) => a.startAt);
  const contagem: Record<string, number> = {};
  for (const inicio of inicios) {
    const k = localDayKey(inicio, tz);
    contagem[k] = (contagem[k] ?? 0) + 1;
  }
  const mes = {
    chaves,
    contagem,
    rotulo: capitalizar(formatWithPattern(dayKeyToUtcStart(primeiroDoMesKey, tz), "MMMM 'de' yyyy", tz)),
    anteriorKey: shiftMes(diaKey, -1),
    seguinteKey: shiftMes(diaKey, 1),
  };

  const config: AgendaConfig = {
    timezone: tz,
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: professional.minAdvanceHours,
    cancellationWindowHours: professional.cancellationWindowHours,
    maintenanceLimitDays: professional.maintenanceLimitDays,
    maintenanceNoticeDay: professional.maintenanceNoticeDay,
    depositType: professional.depositType,
    depositValue: professional.depositValue,
    noShowThreshold: professional.noShowThreshold,
  };

  return (
    <AgendaScreen
      visao={visao}
      diaKey={diaKey}
      hojeKey={hojeKey}
      anteriorKey={anteriorKey}
      proximoKey={proximoKey}
      compromissos={compromissos}
      mes={mes}
      semana={semana}
      clientes={clientes}
      servicos={servicos}
      horarios={workingHours.map(toHorarioFuncionamento)}
      bloqueios={bloqueios}
      config={config}
      novoInicial={novoInicial}
      clienteInicialId={clienteInicialId}
      viewer={{ isOwner: viewer.isOwner, memberId: viewer.memberId }}
      comEquipe={comEquipe}
      // A dona recebe a equipe ativa (só ela, sem equipe): destinos do "Trocar
      // profissional" — inclusive para tirar horários de quem foi desativada.
      equipe={viewer.isOwner ? toAgendaPros(team, viewer.memberId) : []}
      filtroKey={filtro.all ? ALL_KEY : filtro.pro.key}
      prof={prof}
    />
  );
}
