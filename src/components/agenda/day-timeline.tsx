"use client";

/**
 * Visão DIA: linha do tempo vertical com agendamentos e bloqueios.
 * Abre já rolada pro momento relevante, pinta os blocos pela categoria do
 * serviço e cria agendamento com um toque em qualquer espaço vazio
 * (no PC, o horário aparece onde o mouse passa). Com equipe, duas
 * profissionais podem atender no mesmo horário: agendamentos que se
 * sobrepõem ficam lado a lado, cada um na sua raia.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { IconAlert, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  localDayKey,
  localTimeOf,
  localWeekday,
  minutesToTime,
  timeToMinutes,
} from "@/lib/dates";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import type {
  AgendaBloqueio,
  AgendaCompromisso,
  AgendaPro,
  HorarioFuncionamento,
} from "./types";
import { ProAvatar, rotuloQuemAtende } from "./pro";

const PX_POR_MIN = 1.6;
const COLUNA_HORA = 52; // px reservados para os rótulos de hora
/** Onde começam os blocos (coluna de horas + respiro). */
const BASE_BLOCOS = COLUNA_HORA + 4;
/** Respiro entre blocos lado a lado (e na borda direita). */
const RESPIRO = 4;
/** Altura mínima de um bloco: cabe horário + nome. */
const ALTURA_MIN = 50;
/** Para dividir raias, um bloco curto ocupa pelo menos 30 min (a altura dele na tela). */
const DURACAO_MIN_LAYOUT = 30;

const STATUS_PONTO: Record<string, string> = {
  PRE_AGENDADO: "bg-warning",
  CONFIRMADO: "bg-accent",
  CONCLUIDO: "bg-success",
  FALTOU: "bg-danger",
};

/** Tom por categoria do serviço (tokens em globals.css). */
const CATEGORIA: Record<string, { fundo: string; linha: string }> = {
  APLICACAO: { fundo: "var(--cat-aplicacao)", linha: "var(--cat-aplicacao-line)" },
  MANUTENCAO: { fundo: "var(--cat-manutencao)", linha: "var(--cat-manutencao-line)" },
  LASH_LIFTING: { fundo: "var(--cat-lifting)", linha: "var(--cat-lifting-line)" },
};
const CATEGORIA_OUTRO = { fundo: "var(--cat-outro)", linha: "var(--cat-outro-line)" };

type BloqueioDoDia = {
  id: string;
  titulo: string;
  para: string | null;
  inicioMin: number;
  fimMin: number;
};

type Raia = { raia: number; raias: number };

/**
 * Agendamentos que se sobrepõem ficam lado a lado. Varre por horário de
 * início formando grupos de sobreposição; dentro de cada grupo, cada
 * agendamento vai para a primeira raia livre, e todos do grupo dividem a
 * largura pelo número de raias que o grupo precisou.
 */
function distribuirRaias(
  itens: Array<{ id: string; inicio: number; fim: number }>,
): Map<string, Raia> {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
  const resultado = new Map<string, Raia>();
  let grupo: string[] = [];
  let fimDasRaias: number[] = [];
  let fimDoGrupo = -Infinity;

  const fecharGrupo = () => {
    for (const id of grupo) {
      const r = resultado.get(id);
      if (r) r.raias = fimDasRaias.length;
    }
    grupo = [];
    fimDasRaias = [];
    fimDoGrupo = -Infinity;
  };

  for (const it of ordenados) {
    if (grupo.length > 0 && it.inicio >= fimDoGrupo) fecharGrupo();
    let raia = fimDasRaias.findIndex((fim) => fim <= it.inicio);
    if (raia === -1) {
      raia = fimDasRaias.length;
      fimDasRaias.push(it.fim);
    } else {
      fimDasRaias[raia] = it.fim;
    }
    resultado.set(it.id, { raia, raias: 1 });
    grupo.push(it.id);
    fimDoGrupo = Math.max(fimDoGrupo, it.fim);
  }
  fecharGrupo();
  return resultado;
}

/** Posição horizontal da raia: largura = 1/raias, com um respiro entre os blocos. */
function estiloRaia({ raia, raias }: Raia): { left: string; width: string } {
  return {
    left: `calc(${BASE_BLOCOS}px + (100% - ${BASE_BLOCOS}px) * ${raia / raias})`,
    width: `calc((100% - ${BASE_BLOCOS}px) / ${raias} - ${RESPIRO}px)`,
  };
}

export function DayTimeline({
  diaKey,
  hojeKey,
  tz,
  compromissos,
  bloqueios,
  horarios,
  mostrarPro = false,
  equipe = [],
  viewerMemberId = null,
  podeConfigurar = true,
  onSelecionar,
  onNovoHorario,
}: {
  diaKey: string;
  hojeKey: string;
  tz: string;
  compromissos: AgendaCompromisso[];
  bloqueios: AgendaBloqueio[];
  horarios: HorarioFuncionamento[];
  /** Com equipe em "todas": cada bloco mostra quem atende (avatar). */
  mostrarPro?: boolean;
  equipe?: AgendaPro[];
  viewerMemberId?: string | null;
  /** Só a dona ajusta os horários do estúdio (muda a dica do dia fechado). */
  podeConfigurar?: boolean;
  onSelecionar: (c: AgendaCompromisso) => void;
  /** Toque num espaço vazio da timeline → agendar já naquele horário. */
  onNovoHorario?: (hora: string) => void;
}) {
  const [relogioMin, setAgoraMin] = useState<number | null>(null);
  const agoraMin = diaKey === hojeKey ? relogioMin : null;
  const [fantasmaMin, setFantasmaMin] = useState<number | null>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (diaKey !== hojeKey) return;
    const atualizar = () => setAgoraMin(timeToMinutes(localTimeOf(new Date(), tz)));
    atualizar();
    const timer = setInterval(atualizar, 60_000);
    return () => clearInterval(timer);
  }, [diaKey, hojeKey, tz]);

  const { regra, bloqueiosDoDia, inicioMin, fimMin } = useMemo(() => {
    const weekday = localWeekday(dayKeyToUtcStart(diaKey, tz), tz);
    const regra = horarios.find((h) => h.diaSemana === weekday && h.ativo) ?? null;

    const doDia: BloqueioDoDia[] = [];
    for (const b of bloqueios) {
      if (b.tipo === "SEMANAL" && b.diaSemana === weekday && b.horaInicio && b.horaFim) {
        doDia.push({
          id: b.id,
          titulo: b.titulo,
          para: b.para,
          inicioMin: timeToMinutes(b.horaInicio),
          fimMin: timeToMinutes(b.horaFim),
        });
      } else if (b.tipo === "AVULSO" && b.inicio && b.fim) {
        const inicio = new Date(b.inicio);
        const fim = new Date(b.fim);
        const chaveInicio = localDayKey(inicio, tz);
        const chaveFim = localDayKey(fim, tz);
        if (chaveInicio > diaKey || chaveFim < diaKey) continue;
        doDia.push({
          id: b.id,
          titulo: b.titulo,
          para: b.para,
          inicioMin: chaveInicio < diaKey ? 0 : timeToMinutes(localTimeOf(inicio, tz)),
          fimMin: chaveFim > diaKey ? 24 * 60 : timeToMinutes(localTimeOf(fim, tz)),
        });
      }
    }

    let inicioMin = regra ? timeToMinutes(regra.horaInicio) : 8 * 60;
    let fimMin = regra ? timeToMinutes(regra.horaFim) : 19 * 60;
    for (const c of compromissos) {
      inicioMin = Math.min(inicioMin, timeToMinutes(localTimeOf(new Date(c.inicio), tz)));
      const fimC = localDayKey(new Date(c.fim), tz) > diaKey
        ? 24 * 60
        : timeToMinutes(localTimeOf(new Date(c.fim), tz));
      fimMin = Math.max(fimMin, fimC);
    }
    inicioMin = Math.floor(inicioMin / 60) * 60;
    fimMin = Math.min(24 * 60, Math.ceil(fimMin / 60) * 60);

    return { regra, bloqueiosDoDia: doDia, inicioMin, fimMin };
  }, [diaKey, tz, horarios, bloqueios, compromissos]);

  // Minutos de cada agendamento no dia + a raia de cada um (sobreposição lado a lado).
  const blocos = useMemo(() => {
    const itens = compromissos.map((c) => {
      const inicio = new Date(c.inicio);
      const fim = new Date(c.fim);
      const inicioC = timeToMinutes(localTimeOf(inicio, tz));
      const fimC =
        localDayKey(fim, tz) > diaKey ? 24 * 60 : timeToMinutes(localTimeOf(fim, tz));
      return { c, inicio, fim, inicioC, fimC };
    });
    const raias = distribuirRaias(
      itens.map((it) => ({
        id: it.c.id,
        inicio: it.inicioC,
        fim: Math.max(it.fimC, it.inicioC + DURACAO_MIN_LAYOUT),
      })),
    );
    return itens.map((it) => ({ ...it, raia: raias.get(it.c.id) ?? { raia: 0, raias: 1 } }));
  }, [compromissos, diaKey, tz]);

  // Abre já rolada pro que importa: o "agora" (hoje) ou o 1º agendamento,
  // com o "agora" a ~1/4 da altura visível — o que vem depois fica à vista.
  // No PC a grade rola dentro do cartão; no celular, a página inteira.
  // Espera um quadro: o roteador do Next rola a página pro topo ao montar.
  useEffect(() => {
    const rolar = () => {
      const grade = gradeRef.current;
      const caixa = rolagemRef.current;
      if (!grade) return;
      const agora = diaKey === hojeKey ? timeToMinutes(localTimeOf(new Date(), tz)) : null;
      let alvoMin: number | null = null;
      if (agora !== null && agora >= inicioMin && agora <= fimMin) {
        alvoMin = agora;
      } else if (compromissos.length > 0) {
        const primeiro = compromissos.reduce((a, b) => (a.inicio < b.inicio ? a : b));
        alvoMin = timeToMinutes(localTimeOf(new Date(primeiro.inicio), tz));
      }
      if (alvoMin === null) return;
      const deslocamento = (alvoMin - inicioMin) * PX_POR_MIN;
      if (caixa && caixa.scrollHeight > caixa.clientHeight + 4) {
        caixa.scrollTo({ top: Math.max(0, deslocamento - caixa.clientHeight * 0.25), behavior: "auto" });
        return;
      }
      const y =
        grade.getBoundingClientRect().top + window.scrollY + deslocamento - window.innerHeight * 0.3;
      if (y > 40) window.scrollTo({ top: y, behavior: "auto" });
    };
    const quadro = requestAnimationFrame(() => setTimeout(rolar, 60));
    return () => cancelAnimationFrame(quadro);
    // roda só na troca de dia — não a cada tick do relógio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaKey]);

  function minutoDoPonteiro(clientY: number): number | null {
    const grade = gradeRef.current;
    if (!grade) return null;
    const offsetY = clientY - grade.getBoundingClientRect().top;
    const minuto = inicioMin + offsetY / PX_POR_MIN;
    return Math.max(inicioMin, Math.min(fimMin - 30, Math.floor(minuto / 30) * 30));
  }

  function clicarVazio(e: React.MouseEvent<HTMLDivElement>) {
    if (!onNovoHorario) return;
    // só espaço vazio: cliques em agendamentos/bloqueios não contam
    if ((e.target as HTMLElement).closest("button,[data-bloqueio]")) return;
    const m = minutoDoPonteiro(e.clientY);
    if (m !== null) onNovoHorario(minutesToTime(m));
  }

  function moverPonteiro(e: React.PointerEvent<HTMLDivElement>) {
    if (!onNovoHorario || e.pointerType !== "mouse") return;
    if ((e.target as HTMLElement).closest("button,[data-bloqueio]")) {
      setFantasmaMin(null);
      return;
    }
    setFantasmaMin(minutoDoPonteiro(e.clientY));
  }

  if (!regra && compromissos.length === 0 && bloqueiosDoDia.length === 0) {
    return (
      <div className="rounded-[22px] bg-surface px-6 py-14 text-center shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
        <p className="text-[16px] font-bold tracking-[-0.015em] text-ink">Estúdio fechado neste dia</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[14px] text-ink-soft">
          {podeConfigurar
            ? "Não há horário de atendimento para este dia da semana. Ajuste em Configurações › Horários."
            : "Não há horário de atendimento para este dia da semana."}
        </p>
      </div>
    );
  }

  const alturaTotal = (fimMin - inicioMin) * PX_POR_MIN;
  const horas: number[] = [];
  for (let m = inicioMin; m <= fimMin; m += 60) horas.push(m);

  return (
    <div className="rounded-[22px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] overflow-hidden">
      {compromissos.length === 0 ? (
        <p className="border-b border-line px-5 py-3 text-[13px] text-ink-soft">
          Nenhum horário marcado. Toque num espaço livre para agendar.
        </p>
      ) : null}
      <div
        ref={rolagemRef}
        className="px-3 pt-4 pb-12 sm:px-4 lg:max-h-[calc(100dvh-210px)] lg:overflow-y-auto"
      >
        <div
          ref={gradeRef}
          className={cn("relative", onNovoHorario && "cursor-pointer")}
          style={{ height: alturaTotal }}
          onClick={clicarVazio}
          onPointerMove={moverPonteiro}
          onPointerLeave={() => setFantasmaMin(null)}
        >
          {/* Linhas de hora (cheias) e de meia hora (tracejadas) */}
          {horas.map((m) => (
            <div key={m}>
              <div
                className="absolute inset-x-0 flex items-start"
                style={{ top: (m - inicioMin) * PX_POR_MIN }}
              >
                <span
                  className="shrink-0 -translate-y-2 pr-3 text-right text-[11.5px] font-medium tabular-nums text-ink-faint"
                  style={{ width: COLUNA_HORA }}
                >
                  {minutesToTime(m)}
                </span>
                <div className="grow border-t border-line" />
              </div>
              {m + 30 < fimMin ? (
                <div
                  className="absolute right-0 border-t border-dashed border-line/80"
                  style={{ top: (m + 30 - inicioMin) * PX_POR_MIN, left: COLUNA_HORA }}
                />
              ) : null}
            </div>
          ))}

          {/* Bloqueios (hachurado sóbrio) */}
          {bloqueiosDoDia.map((b) => {
            const topo = Math.max(b.inicioMin, inicioMin);
            const base = Math.min(b.fimMin, fimMin);
            if (base <= topo) return null;
            return (
              <div
                key={b.id}
                data-bloqueio
                className="absolute right-1 flex items-center justify-center overflow-hidden rounded-[12px] border border-line"
                style={{
                  left: BASE_BLOCOS,
                  top: (topo - inicioMin) * PX_POR_MIN,
                  height: (base - topo) * PX_POR_MIN,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, var(--surface-sunken) 0 7px, var(--surface) 7px 14px)",
                }}
              >
                <span className="truncate px-2 text-[12px] font-semibold text-ink-soft">
                  {b.titulo}
                  {b.para ? ` · ${b.para}` : ""} · {minutesToTime(b.inicioMin)}–{minutesToTime(b.fimMin)}
                </span>
              </div>
            );
          })}

          {/* Espaço livre sob o mouse (PC) */}
          {fantasmaMin !== null ? (
            <div
              aria-hidden
              className="pointer-events-none absolute right-1 flex items-center gap-1.5 rounded-[12px] border border-dashed border-accent/40 bg-accent-soft/60 px-3 text-[12.5px] font-semibold text-ink"
              style={{
                left: BASE_BLOCOS,
                top: (fantasmaMin - inicioMin) * PX_POR_MIN,
                height: 30 * PX_POR_MIN,
              }}
            >
              <IconPlus width={14} height={14} />
              Agendar às {minutesToTime(fantasmaMin)}
            </div>
          ) : null}

          {/* Agendamentos (lado a lado quando se sobrepõem) */}
          {blocos.map(({ c, inicio, fim, inicioC, fimC, raia }) => {
            const topo = (inicioC - inicioMin) * PX_POR_MIN;
            const altura = Math.max((fimC - inicioC) * PX_POR_MIN, ALTURA_MIN);
            const compacto = altura < 84;
            const tom = CATEGORIA[c.servico.categoria] ?? CATEGORIA_OUTRO;
            const apagado = c.status === "FALTOU";
            const horaInicio = localTimeOf(inicio, tz);
            const horaFim = localTimeOf(fim, tz);
            const quem = mostrarPro ? rotuloQuemAtende(c.profissional, equipe, viewerMemberId) : null;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelecionar(c)}
                aria-label={[
                  `${horaInicio} às ${horaFim}`,
                  c.cliente.nome,
                  c.servico.nome,
                  APPOINTMENT_STATUSES[c.status],
                  quem ? `com ${quem === "Você" ? "você" : quem}` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                className={cn(
                  "absolute flex flex-col justify-start overflow-hidden rounded-[12px] border text-left",
                  "transition-[transform,box-shadow] hover:z-10 hover:shadow-[var(--shadow-card)] active:scale-[0.99]",
                  apagado && "opacity-60",
                )}
                style={{
                  ...estiloRaia(raia),
                  top: topo,
                  height: altura,
                  background: tom.fundo,
                  borderColor: tom.linha,
                }}
              >
                <span className="@container block w-full">
                  <span className="block px-3 py-2 @max-[150px]:px-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums text-ink-soft">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full @max-[84px]:hidden",
                          STATUS_PONTO[c.status] ?? "bg-ink-faint",
                        )}
                        title={APPOINTMENT_STATUSES[c.status]}
                      />
                      <span className="min-w-0 truncate">
                        <span className="@max-[150px]:hidden">
                          {horaInicio}–{horaFim}
                        </span>
                        <span className="hidden @max-[150px]:inline">{horaInicio}</span>
                      </span>
                      {c.cliente.temContraindicacao ? (
                        <IconAlert width={13} height={13} className="shrink-0 text-danger" />
                      ) : null}
                      {quem ? (
                        <ProAvatar
                          nome={c.profissional.nome}
                          cor={c.profissional.cor}
                          size={18}
                          title={`Com ${quem === "Você" ? "você" : quem}`}
                          className="ml-auto"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[14.5px] font-semibold leading-5 text-ink @max-[150px]:text-[13.5px]">
                      {c.cliente.nome}
                    </span>
                    {!compacto ? (
                      <>
                        <span className="block truncate text-[12.5px] text-ink-soft">{c.servico.nome}</span>
                        <span className="mt-1 block truncate text-[11.5px] font-semibold text-ink-soft">
                          {APPOINTMENT_STATUSES[c.status]}
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Agora */}
          {agoraMin !== null && agoraMin >= inicioMin && agoraMin <= fimMin ? (
            <div
              className="pointer-events-none absolute right-0 flex items-center"
              style={{ top: (agoraMin - inicioMin) * PX_POR_MIN, left: COLUNA_HORA - 4 }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
              <span className="grow border-t-[1.5px] border-danger" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
