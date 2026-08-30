"use client";

/** Visão SEMANA: lista dos 7 dias com compromissos resumidos. */
import { useMemo } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { IconAlert, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  formatDateShort,
  localDayKey,
  localTimeOf,
  localWeekday,
} from "@/lib/dates";
import type { AgendaCompromisso } from "./types";

const STATUS_PONTO: Record<string, string> = {
  PRE_AGENDADO: "bg-warning",
  CONFIRMADO: "bg-accent",
  CONCLUIDO: "bg-success",
  FALTOU: "bg-danger",
};

export function WeekList({
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
  const dias = useMemo(() => {
    const base = dayKeyToUtcStart(diaKey, tz);
    const inicioSemana = addDays(base, -localWeekday(base, tz));
    const porDia = new Map<string, AgendaCompromisso[]>();
    for (const c of compromissos) {
      const k = localDayKey(new Date(c.inicio), tz);
      const lista = porDia.get(k) ?? [];
      lista.push(c);
      porDia.set(k, lista);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const data = addDays(inicioSemana, i);
      const chave = localDayKey(data, tz);
      return { chave, data, itens: porDia.get(chave) ?? [] };
    });
  }, [diaKey, tz, compromissos]);

  return (
    <div className="space-y-3">
      {dias.map(({ chave, data, itens }) => {
        const ehHoje = chave === hojeKey;
        return (
          <section
            key={chave}
            className="bg-surface border border-line rounded-2xl overflow-hidden"
          >
            <Link
              href={`/agenda?visao=dia&dia=${chave}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-sunken/60"
            >
              <span
                className={cn(
                  "text-sm font-semibold capitalize",
                  ehHoje ? "text-accent-strong" : "text-ink",
                )}
              >
                {formatDateShort(data, tz)}
                {ehHoje ? (
                  <span className="ml-2 text-[11px] font-medium bg-accent-soft text-accent-strong rounded-full px-2 py-0.5">
                    hoje
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-xs text-ink-faint">
                {itens.length > 0
                  ? `${itens.length} agendamento${itens.length === 1 ? "" : "s"}`
                  : ""}
                <IconChevronRight width={16} height={16} />
              </span>
            </Link>
            {itens.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-ink-faint">Sem agendamentos.</p>
            ) : (
              <ul className="border-t border-line/70 divide-y divide-line/60">
                {itens.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelecionar(c)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-sunken/60"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          STATUS_PONTO[c.status] ?? "bg-ink-faint",
                        )}
                      />
                      <span className="text-sm text-ink-soft tabular-nums shrink-0">
                        {localTimeOf(new Date(c.inicio), tz)}
                      </span>
                      <span className="min-w-0 grow">
                        <span className="flex items-center gap-1 font-medium text-sm text-ink truncate">
                          {c.cliente.nome}
                          {c.cliente.temContraindicacao ? (
                            <IconAlert
                              width={13}
                              height={13}
                              className="text-danger shrink-0"
                            />
                          ) : null}
                        </span>
                        <span className="block text-xs text-ink-soft truncate">
                          {c.servico.nome}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
