import type { Metadata } from "next";
import { addDays } from "date-fns";
import { requireProfessional } from "@/lib/session";
import { dayKeyToUtcStart, localDayKey, localWeekday } from "@/lib/dates";
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
import { prisma } from "@/lib/prisma";
import { BLOCKING_STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "Agenda" };

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
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

  // Navegação e dados por visão
  let anteriorKey: string;
  let proximoKey: string;
  let compromissos: AgendaCompromisso[] = [];
  let mes: { chaves: string[]; contagem: Record<string, number> } | null = null;

  if (visao === "dia") {
    anteriorKey = shiftDia(diaKey, -1, tz);
    proximoKey = shiftDia(diaKey, 1, tz);
    const start = dayKeyToUtcStart(diaKey, tz);
    compromissos = await getCompromissosNoIntervalo(
      professional.id,
      start,
      addDays(start, 1),
    );
  } else if (visao === "semana") {
    const weekday = localWeekday(dayKeyToUtcStart(diaKey, tz), tz);
    const inicioSemanaKey = shiftDia(diaKey, -weekday, tz);
    anteriorKey = shiftDia(diaKey, -7, tz);
    proximoKey = shiftDia(diaKey, 7, tz);
    const start = dayKeyToUtcStart(inicioSemanaKey, tz);
    compromissos = await getCompromissosNoIntervalo(
      professional.id,
      start,
      addDays(start, 7),
    );
  } else {
    const primeiroDoMesKey = `${diaKey.slice(0, 7)}-01`;
    anteriorKey = shiftMes(diaKey, -1);
    proximoKey = shiftMes(diaKey, 1);

    const [ano, mesNum] = primeiroDoMesKey.split("-").map(Number);
    const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
    const offset = localWeekday(dayKeyToUtcStart(primeiroDoMesKey, tz), tz);
    const totalCelulas = Math.ceil((offset + diasNoMes) / 7) * 7;

    const chaves: string[] = [];
    let cursor = addDays(dayKeyToUtcStart(primeiroDoMesKey, tz), -offset);
    for (let i = 0; i < totalCelulas; i++) {
      chaves.push(localDayKey(cursor, tz));
      cursor = addDays(cursor, 1);
    }

    const gridStart = dayKeyToUtcStart(chaves[0], tz);
    const gridEnd = addDays(dayKeyToUtcStart(chaves[chaves.length - 1], tz), 1);
    const appts = await prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        startAt: { gte: gridStart, lt: gridEnd },
        status: { in: [...BLOCKING_STATUSES] },
      },
      select: { startAt: true },
    });
    const contagem: Record<string, number> = {};
    for (const a of appts) {
      const k = localDayKey(a.startAt, tz);
      contagem[k] = (contagem[k] ?? 0) + 1;
    }
    mes = { chaves, contagem };
  }

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
