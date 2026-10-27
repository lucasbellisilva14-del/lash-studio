import type { Metadata } from "next";
import { addDays } from "date-fns";
import { requireProfessional } from "@/lib/session";
import { dayKeyToUtcStart, formatWithPattern, localDayKey, localWeekday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AgendaScreen } from "@/components/agenda/agenda-screen";
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
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const tz = professional.timezone;
  const hojeKey = localDayKey(new Date(), tz);

  const rawVisao = primeiro(sp.visao);
  const visao: VisaoAgenda =
    rawVisao === "semana" || rawVisao === "mes" ? rawVisao : "dia";
  const rawDia = primeiro(sp.dia);
  const diaKey =
    rawDia && /^\d{4}-\d{2}-\d{2}$/.test(rawDia) ? rawDia : hojeKey;
  const novoInicial = primeiro(sp.novo) === "1";
  const clienteInicialId = primeiro(sp.cliente) || null;

  const [{ workingHours, blocks }, clientes, servicos] = await Promise.all([
    getGradeAgenda(professional.id),
    getClientesAgenda(professional.id),
    getServicosAtivos(professional.id),
  ]);

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
  let anteriorKey: string;
  let proximoKey: string;
  let compromissos: AgendaCompromisso[] = [];

  if (visao === "dia") {
    anteriorKey = shiftDia(diaKey, -1, tz);
    proximoKey = shiftDia(diaKey, 1, tz);
    const start = dayKeyToUtcStart(diaKey, tz);
    compromissos = await getCompromissosNoIntervalo(professional.id, start, addDays(start, 1));
  } else if (visao === "semana") {
    anteriorKey = shiftDia(diaKey, -7, tz);
    proximoKey = shiftDia(diaKey, 7, tz);
    const start = dayKeyToUtcStart(inicioSemanaKey, tz);
    compromissos = await getCompromissosNoIntervalo(professional.id, start, addDays(start, 7));
  } else {
    anteriorKey = shiftMes(diaKey, -1);
    proximoKey = shiftMes(diaKey, 1);
    // A grade inteira: alimenta os pontos E a lista do dia selecionado.
    compromissos = await getCompromissosNoIntervalo(professional.id, gridStart, gridEnd);
  }

  // Contagem por dia na grade (pontos do calendário e da faixa da semana)
  const inicios =
    visao === "mes"
      ? compromissos
          .filter((c) => (BLOCKING_STATUSES as readonly string[]).includes(c.status))
          .map((c) => new Date(c.inicio))
      : (
          await prisma.appointment.findMany({
            where: {
              professionalId: professional.id,
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
      bloqueios={blocks.map(toAgendaBloqueio)}
      config={config}
      novoInicial={novoInicial}
      clienteInicialId={clienteInicialId}
    />
  );
}
