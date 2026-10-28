/**
 * Relatórios — indicadores por profissional. Puro (sem banco): recebe as
 * linhas já buscadas (./data) e devolve os números. memberId nulo = a dona.
 *
 * Definições, numa janela [início, fim) — 30/90/365 dias até hoje, ou um mês:
 * - Retorno: das clientes distintas que ela atendeu (CONCLUIDO) na janela, a
 *   fração que voltou com ela: 2+ CONCLUIDO com ela na janela, OU horário
 *   futuro marcado com ela (CONFIRMADO/PRE_AGENDADO de agora em diante), OU,
 *   numa janela já encerrada (um mês fechado), um CONCLUIDO com ela depois do
 *   fim da janela. Numa janela que termina hoje esse último caso não existe.
 * - Faltas: FALTOU ÷ (CONCLUIDO + FALTOU) dela na janela.
 * - Cancelamentos: (CANCELADO + CANCELADO_TARDE) ÷ todos os agendamentos dela
 *   na janela.
 * - Ocupação: minutos atendidos (endAt − startAt dos CONCLUIDO dela) ÷ minutos
 *   disponíveis (em cada dia, o horário de funcionamento do estúdio menos os
 *   bloqueios que valem para ela, AVULSO e SEMANAL, sem contar duas vezes o
 *   que se sobrepõe). Os dois lados vão do início da janela até agora.
 * Sem base (nenhuma cliente, nenhum horário...), o % fica null e a tela
 * mostra "—": nunca há divisão por zero.
 */
import { localDayKey, localToUtc } from "@/lib/dates";

/** Intervalo [início, fim) em instantes UTC. */
export type Janela = { inicio: Date; fim: Date };

/** Agendamento da janela (qualquer status). */
export type AgendamentoDaJanela = {
  clientId: string;
  memberId: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
};

/** Cliente com retorno depois da janela ou horário futuro, e com quem. */
export type RetornoRow = { clientId: string; memberId: string | null };

/** Horário de funcionamento do estúdio (WorkingHour). */
export type ExpedienteRow = { weekday: number; startTime: string; endTime: string; active: boolean };

/** Bloqueio da agenda (ScheduleBlock): AVULSO (intervalo) ou SEMANAL (dia da semana). */
export type BloqueioRow = {
  type: string;
  startAt: Date | null;
  endAt: Date | null;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  memberId: string | null;
  allTeam: boolean;
};

/** O que os indicadores precisam além dos agendamentos da janela. */
export type BaseDosIndicadores = {
  expedientes: ExpedienteRow[];
  bloqueios: BloqueioRow[];
  retornos: RetornoRow[];
};

export type Indicadores = {
  /** CONCLUIDO dela na janela. */
  concluidos: number;
  retorno: { voltaram: number; clientes: number; pct: number | null };
  faltas: { faltas: number; base: number; pct: number | null };
  cancelamentos: { cancelados: number; total: number; pct: number | null };
  ocupacao: { atendidoMin: number; disponivelMin: number; pct: number | null };
};

type Intervalo = { ini: number; fim: number };

const MINUTO_MS = 60_000;

/** A janela cortada em "agora": o que já aconteceu. */
export function ateAgora(janela: Janela, agora: Date): Janela {
  return { inicio: janela.inicio, fim: agora < janela.fim ? agora : janela.fim };
}

/** Mesmo critério de blockScopeFor (@/lib/team): os do estúdio inteiro + os dela. */
export function valeParaPro(bloqueio: Pick<BloqueioRow, "allTeam" | "memberId">, memberId: string | null): boolean {
  return bloqueio.allTeam || bloqueio.memberId === memberId;
}

/* ------------------------------------------------------------------ */
/* Intervalos                                                          */
/* ------------------------------------------------------------------ */

function recortar(i: Intervalo, ini: number, fim: number): Intervalo | null {
  const a = Math.max(i.ini, ini);
  const b = Math.min(i.fim, fim);
  return Number.isFinite(a) && Number.isFinite(b) && a < b ? { ini: a, fim: b } : null;
}

/** Comprimento da união (bloqueios sobrepostos contam uma vez só). */
function medidaDaUniao(intervalos: Intervalo[]): number {
  if (intervalos.length === 0) return 0;
  const ordenados = [...intervalos].sort((x, y) => x.ini - y.ini);
  let total = 0;
  let atual = { ...ordenados[0] };
  for (let k = 1; k < ordenados.length; k++) {
    const i = ordenados[k];
    if (i.ini <= atual.fim) {
      atual.fim = Math.max(atual.fim, i.fim);
    } else {
      total += atual.fim - atual.ini;
      atual = { ...i };
    }
  }
  return total + (atual.fim - atual.ini);
}

/* ------------------------------------------------------------------ */
/* Dias locais (chaves "yyyy-MM-dd": aritmética de calendário pura)    */
/* ------------------------------------------------------------------ */

function partes(dayKey: string): [number, number, number] {
  const [y, m, d] = dayKey.split("-").map(Number);
  return [y, m, d];
}

/** Dia da semana da data (0 = domingo .. 6 = sábado), como WorkingHour.weekday. */
function diaDaSemana(dayKey: string): number {
  const [y, m, d] = partes(dayKey);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function diaSeguinte(dayKey: string): string {
  const [y, m, d] = partes(dayKey);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** "HH:mm"–"HH:mm" de um dia local, como instantes UTC (fuso do estúdio). */
function intervaloLocal(dayKey: string, inicio: string, fim: string, tz: string): Intervalo {
  return { ini: localToUtc(dayKey, inicio, tz).getTime(), fim: localToUtc(dayKey, fim, tz).getTime() };
}

/* ------------------------------------------------------------------ */
/* Ocupação: horas abertas na agenda                                   */
/* ------------------------------------------------------------------ */

type Grade = {
  /** Dias com expediente dentro da janela (expediente já recortado nela). */
  dias: { expediente: Intervalo; semanais: { bloqueio: BloqueioRow; intervalo: Intervalo }[] }[];
  avulsos: { bloqueio: BloqueioRow; intervalo: Intervalo }[];
};

/**
 * Expediente de cada dia da janela e os bloqueios que caem nele. Montada uma
 * vez por tela; a conta de cada profissional só filtra os bloqueios dela.
 */
function montarGrade(janela: Janela, expedientes: ExpedienteRow[], bloqueios: BloqueioRow[], tz: string): Grade {
  const ini = janela.inicio.getTime();
  const fim = janela.fim.getTime();
  if (!(fim > ini)) return { dias: [], avulsos: [] };

  const avulsos: Grade["avulsos"] = [];
  const semanaisPorDia = new Map<number, BloqueioRow[]>();
  for (const b of bloqueios) {
    if (b.type === "AVULSO" && b.startAt && b.endAt) {
      const intervalo = recortar({ ini: b.startAt.getTime(), fim: b.endAt.getTime() }, ini, fim);
      if (intervalo) avulsos.push({ bloqueio: b, intervalo });
    } else if (b.type === "SEMANAL" && b.weekday != null && b.startTime && b.endTime) {
      const lista = semanaisPorDia.get(b.weekday) ?? [];
      lista.push(b);
      semanaisPorDia.set(b.weekday, lista);
    }
  }

  // WorkingHour é único por dia da semana: uma regra por dia.
  const regras = new Map<number, ExpedienteRow>();
  for (const e of expedientes) if (e.active) regras.set(e.weekday, e);

  const dias: Grade["dias"] = [];
  const ultimoDia = localDayKey(new Date(fim - 1), tz);
  for (let dia = localDayKey(janela.inicio, tz); dia <= ultimoDia; dia = diaSeguinte(dia)) {
    const weekday = diaDaSemana(dia);
    const regra = regras.get(weekday);
    if (!regra) continue;
    const expediente = recortar(intervaloLocal(dia, regra.startTime, regra.endTime, tz), ini, fim);
    if (!expediente) continue;
    const semanais = (semanaisPorDia.get(weekday) ?? []).map((bloqueio) => ({
      bloqueio,
      intervalo: intervaloLocal(dia, bloqueio.startTime ?? "", bloqueio.endTime ?? "", tz),
    }));
    dias.push({ expediente, semanais });
  }
  return { dias, avulsos };
}

/** Minutos abertos na agenda de uma profissional: expediente − bloqueios dela. */
function minutosDisponiveis(grade: Grade, memberId: string | null): number {
  const avulsos = grade.avulsos.filter((a) => valeParaPro(a.bloqueio, memberId));
  let total = 0;
  for (const { expediente, semanais } of grade.dias) {
    const cortes: Intervalo[] = [];
    for (const s of semanais) {
      if (!valeParaPro(s.bloqueio, memberId)) continue;
      const corte = recortar(s.intervalo, expediente.ini, expediente.fim);
      if (corte) cortes.push(corte);
    }
    for (const a of avulsos) {
      const corte = recortar(a.intervalo, expediente.ini, expediente.fim);
      if (corte) cortes.push(corte);
    }
    total += expediente.fim - expediente.ini - medidaDaUniao(cortes);
  }
  return Math.round(total / MINUTO_MS);
}

/* ------------------------------------------------------------------ */
/* Os quatro indicadores                                               */
/* ------------------------------------------------------------------ */

function indicadoresDa(
  memberId: string | null,
  agendamentos: AgendamentoDaJanela[],
  retornos: RetornoRow[],
  corte: Janela,
  disponivelMin: number,
): Indicadores {
  const ini = corte.inicio.getTime();
  const fim = corte.fim.getTime();
  let total = 0;
  let concluidos = 0;
  let faltas = 0;
  let cancelados = 0;
  let atendidoMs = 0;
  const concluidosPorCliente = new Map<string, number>();

  for (const a of agendamentos) {
    if (a.memberId !== memberId) continue;
    total += 1;
    if (a.status === "CONCLUIDO") {
      concluidos += 1;
      concluidosPorCliente.set(a.clientId, (concluidosPorCliente.get(a.clientId) ?? 0) + 1);
      const atendido = recortar({ ini: a.startAt.getTime(), fim: a.endAt.getTime() }, ini, fim);
      if (atendido) atendidoMs += atendido.fim - atendido.ini;
    } else if (a.status === "FALTOU") {
      faltas += 1;
    } else if (a.status === "CANCELADO" || a.status === "CANCELADO_TARDE") {
      cancelados += 1;
    }
  }

  const voltaramDepois = new Set<string>();
  for (const r of retornos) if (r.memberId === memberId) voltaramDepois.add(r.clientId);
  let voltaram = 0;
  for (const [clientId, vezes] of concluidosPorCliente) {
    if (vezes >= 2 || voltaramDepois.has(clientId)) voltaram += 1;
  }

  const clientes = concluidosPorCliente.size;
  const base = concluidos + faltas;
  const atendidoMin = Math.round(atendidoMs / MINUTO_MS);
  return {
    concluidos,
    retorno: { voltaram, clientes, pct: clientes > 0 ? voltaram / clientes : null },
    faltas: { faltas, base, pct: base > 0 ? faltas / base : null },
    cancelamentos: { cancelados, total, pct: total > 0 ? cancelados / total : null },
    ocupacao: { atendidoMin, disponivelMin, pct: disponivelMin > 0 ? atendidoMin / disponivelMin : null },
  };
}

type DadosDosIndicadores = {
  /** Os da janela (startAt em [início, fim)), de qualquer status. */
  agendamentos: AgendamentoDaJanela[];
  base: BaseDosIndicadores;
  janela: Janela;
  agora: Date;
  /** Fuso do estúdio. */
  tz: string;
};

/** Indicadores de cada profissional pedida (memberId nulo = a dona); a grade do período é montada uma vez. */
export function indicadoresDasProfissionais(
  params: DadosDosIndicadores & { memberIds: (string | null)[] },
): Map<string | null, Indicadores> {
  const corte = ateAgora(params.janela, params.agora);
  const grade = montarGrade(corte, params.base.expedientes, params.base.bloqueios, params.tz);
  const resultado = new Map<string | null, Indicadores>();
  for (const memberId of params.memberIds) {
    if (resultado.has(memberId)) continue;
    resultado.set(
      memberId,
      indicadoresDa(memberId, params.agendamentos, params.base.retornos, corte, minutosDisponiveis(grade, memberId)),
    );
  }
  return resultado;
}

/** Indicadores de uma profissional (memberId nulo = a dona). */
export function indicadoresDaProfissional(
  params: DadosDosIndicadores & { memberId: string | null },
): Indicadores {
  const corte = ateAgora(params.janela, params.agora);
  const grade = montarGrade(corte, params.base.expedientes, params.base.bloqueios, params.tz);
  return indicadoresDa(
    params.memberId,
    params.agendamentos,
    params.base.retornos,
    corte,
    minutosDisponiveis(grade, params.memberId),
  );
}
