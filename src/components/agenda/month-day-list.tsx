"use client";

/** Lista do dia selecionado na visão MÊS: hora, cliente, serviço, preço e
 *  status — tocar abre o detalhe (mesmo sheet da visão dia). Com equipe em
 *  "todas", cada horário diz quem atende. */
import { useMemo } from "react";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { IconAlert } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import {
  dayKeyToUtcStart,
  formatDateLong,
  localDayKey,
  localTimeOf,
} from "@/lib/dates";
import type { AgendaCompromisso, AgendaPro } from "./types";
import { ProAvatar, rotuloQuemAtende } from "./pro";

export function MonthDayList({
  diaKey,
  hojeKey,
  tz,
  compromissos,
  mostrarPro = false,
  equipe = [],
  viewerMemberId = null,
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
    <section aria-label={`Atendimentos de ${rotulo}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink first-letter:uppercase">
          {diaKey === hojeKey ? `Hoje, ${rotulo.split(", ")[1] ?? rotulo}` : rotulo}
        </h2>
        <span className="text-[13px] text-ink-soft">
          {itens.length === 0 ? "" : `${itens.length} horário${itens.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-[22px] bg-surface px-5 py-8 text-center shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
          <p className="text-[15px] font-semibold text-ink">Dia livre</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">Nenhum horário marcado neste dia.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
          {itens.map((c) => {
            const quem = mostrarPro
              ? rotuloQuemAtende(c.profissional, equipe, viewerMemberId)
              : null;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelecionar(c)}
                  className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left hover:bg-surface-muted transition-colors"
                >
                  <span className="w-12 shrink-0">
                    <span className="block text-[15px] font-bold tabular-nums tracking-[-0.02em] text-ink">
                      {localTimeOf(new Date(c.inicio), tz)}
                    </span>
                    <span className="block text-[11.5px] tabular-nums text-ink-faint">
                      {localTimeOf(new Date(c.fim), tz)}
                    </span>
                  </span>
                  <span className="min-w-0 grow">
                    <span className="flex items-center gap-1 truncate text-[15px] font-semibold text-ink">
                      <span className="truncate">{c.cliente.nome}</span>
                      {c.cliente.temContraindicacao ? (
                        <IconAlert width={14} height={14} className="shrink-0 text-danger" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                      {c.servico.nome} · {formatBRL(c.precoCents)}
                    </span>
                    {quem ? (
                      <span className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                        <ProAvatar nome={c.profissional.nome} cor={c.profissional.cor} size={18} />
                        <span className="truncate">Com {quem === "Você" ? "você" : quem}</span>
                      </span>
                    ) : null}
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
