"use client";

/** Visão DIA: linha do tempo vertical com agendamentos e bloqueios. */
import { useEffect, useMemo, useState } from "react";
import { IconAlert } from "@/components/ui/icons";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  localDayKey,
  localTimeOf,
  localWeekday,
  minutesToTime,
  timeToMinutes,
} from "@/lib/dates";
import type {
  AgendaBloqueio,
  AgendaCompromisso,
  HorarioFuncionamento,
} from "./types";

const PX_POR_MIN = 1.5;

const STATUS_BARRA: Record<string, string> = {
  PRE_AGENDADO: "bg-warning",
  CONFIRMADO: "bg-accent",
  CONCLUIDO: "bg-success",
  FALTOU: "bg-danger",
};

type BloqueioDoDia = { id: string; titulo: string; inicioMin: number; fimMin: number };

export function DayTimeline({
  diaKey,
  hojeKey,
  tz,
  compromissos,
  bloqueios,
  horarios,
  onSelecionar,
}: {
  diaKey: string;
  hojeKey: string;
  tz: string;
  compromissos: AgendaCompromisso[];
  bloqueios: AgendaBloqueio[];
  horarios: HorarioFuncionamento[];
  onSelecionar: (c: AgendaCompromisso) => void;
}) {
  const [agoraMin, setAgoraMin] = useState<number | null>(null);

  useEffect(() => {
    if (diaKey !== hojeKey) {
      setAgoraMin(null);
      return;
    }
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

  if (!regra && compromissos.length === 0 && bloqueiosDoDia.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-2xl py-14 px-6 text-center">
        <p className="font-medium text-ink">Estúdio fechado neste dia</p>
        <p className="text-sm text-ink-soft mt-1">
          Sem horário de funcionamento configurado para esse dia da semana.
        </p>
      </div>
    );
  }

  const alturaTotal = (fimMin - inicioMin) * PX_POR_MIN;
  const horas: number[] = [];
  for (let m = inicioMin; m <= fimMin; m += 60) horas.push(m);

  return (
    <div className="bg-surface border border-line rounded-2xl p-3 overflow-hidden">
      {compromissos.length === 0 ? (
        <p className="text-sm text-ink-faint text-center pb-2 pt-1">
          Nenhum agendamento neste dia.
        </p>
      ) : null}
      <div className="relative" style={{ height: alturaTotal }}>
        {/* Linhas de hora */}
        {horas.map((m) => (
          <div
            key={m}
            className="absolute inset-x-0 flex items-start gap-2"
            style={{ top: (m - inicioMin) * PX_POR_MIN }}
          >
            <span className="w-11 shrink-0 text-[11px] text-ink-faint -translate-y-1.5 text-right pr-1 tabular-nums">
              {minutesToTime(m)}
            </span>
            <div className="grow border-t border-line/70" />
          </div>
        ))}

        {/* Bloqueios (visual sóbrio hachurado) */}
        {bloqueiosDoDia.map((b) => {
          const topo = Math.max(b.inicioMin, inicioMin);
          const base = Math.min(b.fimMin, fimMin);
          if (base <= topo) return null;
          return (
            <div
              key={b.id}
              className="absolute left-12 right-1 rounded-lg border border-line/80 flex items-center justify-center overflow-hidden"
              style={{
                top: (topo - inicioMin) * PX_POR_MIN,
                height: (base - topo) * PX_POR_MIN,
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--surface-sunken) 0 8px, transparent 8px 16px)",
              }}
            >
              <span className="text-xs font-medium text-ink-faint px-2 truncate">
                {b.titulo} · {minutesToTime(b.inicioMin)}–{minutesToTime(b.fimMin)}
              </span>
            </div>
          );
        })}

        {/* Agendamentos */}
        {compromissos.map((c) => {
          const inicio = new Date(c.inicio);
          const fim = new Date(c.fim);
          const inicioC = timeToMinutes(localTimeOf(inicio, tz));
          const fimC =
            localDayKey(fim, tz) > diaKey ? 24 * 60 : timeToMinutes(localTimeOf(fim, tz));
          const topo = (inicioC - inicioMin) * PX_POR_MIN;
          const altura = Math.max((fimC - inicioC) * PX_POR_MIN, 52);
          const compacto = altura < 80;
          return (
            <button
              key={c.id}
              onClick={() => onSelecionar(c)}
              className={cn(
                "absolute left-12 right-1 text-left rounded-xl border border-line bg-surface",
                "shadow-[0_1px_3px_rgba(28,25,23,0.08)] overflow-hidden",
                "active:scale-[0.99] transition-transform",
              )}
              style={{ top: topo, height: altura }}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  STATUS_BARRA[c.status] ?? "bg-ink-faint",
                )}
              />
              <span className="block pl-3 pr-2 py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-ink-soft tabular-nums">
                  {localTimeOf(inicio, tz)}–{localTimeOf(fim, tz)}
                  {c.cliente.temContraindicacao ? (
                    <IconAlert width={14} height={14} className="text-danger shrink-0" />
                  ) : null}
                </span>
                <span className="block font-medium text-[15px] text-ink truncate leading-5">
                  {c.cliente.nome}
                </span>
                {!compacto ? (
                  <>
                    <span className="block text-[13px] text-ink-soft truncate">
                      {c.servico.nome}
                    </span>
                    <span className="mt-1 inline-block">
                      <AppointmentStatusBadge status={c.status} />
                    </span>
                  </>
                ) : null}
              </span>
            </button>
          );
        })}

        {/* Agora */}
        {agoraMin !== null && agoraMin >= inicioMin && agoraMin <= fimMin ? (
          <div
            className="absolute left-11 right-0 flex items-center pointer-events-none"
            style={{ top: (agoraMin - inicioMin) * PX_POR_MIN }}
          >
            <span className="h-2 w-2 rounded-full bg-danger -translate-x-1" />
            <span className="grow border-t-2 border-danger/70" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
