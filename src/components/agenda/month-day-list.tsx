"use client";

/** Lista do dia selecionado na visão MÊS: cards com hora, cliente, serviço,
 *  preço e status — tocar abre o detalhe (mesmo sheet da visão dia). */
import { useMemo } from "react";
import { IconAlert, IconCalendar } from "@/components/ui/icons";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import {
  dayKeyToUtcStart,
  formatDateLong,
  localDayKey,
  localTimeOf,
} from "@/lib/dates";
import type { AgendaCompromisso } from "./types";

export function MonthDayList({
  diaKey,
  hojeKey,
  tz,
  compromissos,
  onSelecionar,
}: {
  diaKey: string;
  hojeKey: string;
  tz: string;
  compromissos: AgendaCompromisso[];
  onSelecionar: (c: AgendaCompromisso) => void;
}) {
  const itens = useMemo(
    () =>
      compromissos
        .filter((c) => localDayKey(new Date(c.inicio), tz) === diaKey)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [compromissos, diaKey, tz],
  );

  const rotulo = formatDateLong(dayKeyToUtcStart(diaKey, tz), tz);

  return (
    <section className="mt-4" aria-label={`Atendimentos de ${rotulo}`}>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-ink capitalize">
          {rotulo}
          {diaKey === hojeKey ? (
            <span className="ml-2 text-[11px] font-medium bg-accent-soft text-accent-strong rounded-full px-2 py-0.5">
              hoje
            </span>
          ) : null}
        </h2>
        <span className="text-xs text-ink-faint">
          {itens.length === 0
            ? ""
            : `${itens.length} atendimento${itens.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {itens.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl px-4 py-6 text-center">
          <IconCalendar width={22} height={22} className="mx-auto text-ink-faint mb-1.5" />
          <p className="text-sm text-ink-faint">Nenhum atendimento neste dia.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {itens.map((c) => {
            const inicial = c.cliente.nome.trim().charAt(0).toUpperCase();
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelecionar(c)}
                  className={cn(
                    "w-full flex items-center gap-3 bg-surface border border-line rounded-2xl px-3.5 py-3 text-left",
                    "shadow-[var(--shadow-card)] hover:bg-surface-sunken/50 transition-colors",
                  )}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong font-semibold text-[15px] shrink-0">
                    {inicial}
                  </span>
                  <span className="min-w-0 grow">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-accent-strong bg-accent-soft rounded-full px-2 py-0.5 tabular-nums shrink-0">
                        {localTimeOf(new Date(c.inicio), tz)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[15px] text-ink truncate">
                        {c.cliente.nome}
                        {c.cliente.temContraindicacao ? (
                          <IconAlert width={13} height={13} className="text-danger shrink-0" />
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-2 min-w-0">
                      <span className="text-xs text-ink-soft truncate">{c.servico.nome}</span>
                      <span className="text-xs font-semibold text-accent-strong shrink-0">
                        {formatBRL(c.precoCents)}
                      </span>
                    </span>
                  </span>
                  <AppointmentStatusBadge status={c.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
