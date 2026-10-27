"use client";

/** Visão SEMANA (seg → dom): cada dia com seus horários resumidos. */
import { useMemo } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { IconAlert, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  formatWithPattern,
  localDayKey,
  localTimeOf,
  localWeekday,
} from "@/lib/dates";
import type { AgendaCompromisso, AgendaPro } from "./types";
import { ProAvatar, agendaHref, rotuloQuemAtende } from "./pro";

const STATUS_PONTO: Record<string, string> = {
  PRE_AGENDADO: "bg-warning",
  CONFIRMADO: "bg-accent",
  CONCLUIDO: "bg-success",
  FALTOU: "bg-danger",
};

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WeekList({
  diaKey,
  hojeKey,
  tz,
  compromissos,
  mostrarPro = false,
  equipe = [],
  viewerMemberId = null,
  prof = null,
  onSelecionar,
}: {
  diaKey: string;
  hojeKey: string;
  tz: string;
  compromissos: AgendaCompromisso[];
  /** Com equipe em "todas": cada horário mostra quem atende. */
  mostrarPro?: boolean;
  equipe?: AgendaPro[];
  viewerMemberId?: string | null;
  /** Filtro de profissional (?prof=) que os links preservam. */
  prof?: string | null;
  onSelecionar: (c: AgendaCompromisso) => void;
}) {
  const dias = useMemo(() => {
    const base = dayKeyToUtcStart(diaKey, tz);
    const inicioSemana = addDays(base, -((localWeekday(base, tz) + 6) % 7));
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
      const itens = (porDia.get(chave) ?? []).sort((a, b) => a.inicio.localeCompare(b.inicio));
      return { chave, data, itens };
    });
  }, [diaKey, tz, compromissos]);

  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {dias.map(({ chave, data, itens }) => {
        const ehHoje = chave === hojeKey;
        return (
          <section
            key={chave}
            className="overflow-hidden rounded-[22px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]"
          >
            <Link
              href={agendaHref("dia", chave, prof)}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-muted"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold tabular-nums",
                    ehHoje ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink",
                  )}
                >
                  {formatWithPattern(data, "d", tz)}
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-ink">
                    {capitalizar(formatWithPattern(data, "EEEE", tz))}
                  </span>
                  <span className="block text-[12.5px] text-ink-soft">
                    {itens.length === 0
                      ? "Livre"
                      : `${itens.length} horário${itens.length === 1 ? "" : "s"}`}
                  </span>
                </span>
              </span>
              <IconChevronRight width={16} height={16} className="text-ink-faint" />
            </Link>
            {itens.length > 0 ? (
              <ul className="divide-y divide-line border-t border-line">
                {itens.map((c) => {
                  const quem = mostrarPro
                    ? rotuloQuemAtende(c.profissional, equipe, viewerMemberId)
                    : null;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelecionar(c)}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-muted"
                      >
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_PONTO[c.status] ?? "bg-ink-faint")}
                        />
                        <span className="w-11 shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                          {localTimeOf(new Date(c.inicio), tz)}
                        </span>
                        <span className="min-w-0 grow">
                          <span className="flex items-center gap-1 truncate text-[14px] font-semibold text-ink">
                            <span className="truncate">{c.cliente.nome}</span>
                            {c.cliente.temContraindicacao ? (
                              <IconAlert width={13} height={13} className="shrink-0 text-danger" />
                            ) : null}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-soft">{c.servico.nome}</span>
                        </span>
                        {quem ? (
                          <span className="flex max-w-[40%] shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                            <ProAvatar nome={c.profissional.nome} cor={c.profissional.cor} size={20} />
                            <span className="truncate">{quem}</span>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
