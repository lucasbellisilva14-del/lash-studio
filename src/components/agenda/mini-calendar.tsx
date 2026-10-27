"use client";

/**
 * Calendário do mês (semana começa na segunda). Hoje = círculo escuro;
 * dia selecionado = quadrado com contorno. Um ponto marca dia com horário.
 * `size="sm"`: coluna da agenda no PC. `size="lg"`: visão Mês.
 */
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { agendaHref } from "./pro";
import type { VisaoAgenda } from "./types";

export const DIAS_SEMANA_SEG = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export function MiniCalendar({
  chaves,
  contagem,
  diaKey,
  hojeKey,
  visao,
  mesLabel,
  mesAnteriorKey,
  mesSeguinteKey,
  prof = null,
  size = "sm",
}: {
  chaves: string[];
  contagem: Record<string, number>;
  diaKey: string;
  hojeKey: string;
  visao: VisaoAgenda;
  mesLabel: string;
  mesAnteriorKey: string;
  mesSeguinteKey: string;
  /** Filtro de profissional (?prof=) que os links preservam. */
  prof?: string | null;
  size?: "sm" | "lg";
}) {
  const mesPrefixo = diaKey.slice(0, 7);
  const lg = size === "lg";

  return (
    <div
      className={cn(
        "rounded-[22px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]",
        lg ? "p-4 sm:p-5" : "p-4",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={agendaHref(visao, mesAnteriorKey, prof)}
          scroll={false}
          aria-label="Mês anterior"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
        >
          <IconChevronLeft width={17} height={17} />
        </Link>
        <p className={cn("font-bold tracking-[-0.015em] text-ink", lg ? "text-[16px]" : "text-[14px]")}>
          {mesLabel}
        </p>
        <Link
          href={agendaHref(visao, mesSeguinteKey, prof)}
          scroll={false}
          aria-label="Próximo mês"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
        >
          <IconChevronRight width={17} height={17} />
        </Link>
      </div>

      <div className="grid grid-cols-7">
        {DIAS_SEMANA_SEG.map((d) => (
          <span key={d} className="py-1 text-center text-[11.5px] font-semibold text-ink-faint">
            {d}
          </span>
        ))}
      </div>

      <div className={cn("grid grid-cols-7", lg ? "gap-1" : "gap-y-0.5")}>
        {chaves.map((chave) => {
          const doMes = chave.startsWith(mesPrefixo);
          if (!doMes && !lg) return <span key={chave} aria-hidden />;
          const ehHoje = chave === hojeKey;
          const selecionado = chave === diaKey && !ehHoje;
          const total = contagem[chave] ?? 0;
          return (
            <Link
              key={chave}
              href={agendaHref(visao, chave, prof)}
              scroll={false}
              aria-label={`${Number(chave.slice(8))}/${chave.slice(5, 7)}${total ? `, ${total} horário${total === 1 ? "" : "s"}` : ""}`}
              aria-current={chave === diaKey ? "date" : undefined}
              className={cn(
                "group relative flex flex-col items-center justify-center",
                lg ? "aspect-square rounded-[14px] gap-1 pb-0.5" : "h-9",
                lg && !selecionado && "hover:bg-surface-sunken",
                lg && selecionado && "bg-accent-soft ring-2 ring-accent",
                !doMes && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center tabular-nums transition-colors",
                  lg ? "h-7 w-7 text-[14px]" : "h-8 w-8 text-[13px]",
                  ehHoje
                    ? "rounded-full bg-accent font-bold text-accent-ink"
                    : selecionado && !lg
                      ? "rounded-[10px] bg-accent-soft font-bold text-ink ring-2 ring-accent"
                      : selecionado
                        ? "font-bold text-ink"
                        : cn("rounded-full text-ink", !lg && "group-hover:bg-surface-sunken"),
                )}
              >
                {Number(chave.slice(8))}
              </span>
              {lg ? (
                total > 0 ? (
                  total > 3 ? (
                    <span className="rounded-full bg-surface-sunken px-1.5 text-[10.5px] font-semibold leading-4 text-ink-soft tabular-nums">
                      {total}
                    </span>
                  ) : (
                    <span className="flex gap-0.5">
                      {Array.from({ length: total }, (_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent/70" />
                      ))}
                    </span>
                  )
                ) : (
                  <span className="h-1.5" />
                )
              ) : total > 0 && !ehHoje && !selecionado ? (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent/60" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
