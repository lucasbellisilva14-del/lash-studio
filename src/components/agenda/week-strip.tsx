"use client";

/**
 * Faixa da semana (celular, visão Dia): 7 dias a partir da segunda.
 * Hoje = círculo escuro; dia aberto = quadrado com contorno; ponto = tem horário.
 */
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { DIAS_SEMANA_SEG } from "./mini-calendar";

export function WeekStrip({
  dias,
  contagem,
  diaKey,
  hojeKey,
  semanaAnteriorKey,
  semanaSeguinteKey,
}: {
  /** As 7 chaves yyyy-MM-dd da semana (seg → dom). */
  dias: string[];
  contagem: Record<string, number>;
  diaKey: string;
  hojeKey: string;
  semanaAnteriorKey: string;
  semanaSeguinteKey: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[22px] bg-surface px-1.5 py-2 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
      <Link
        href={`/agenda?visao=dia&dia=${semanaAnteriorKey}`}
        scroll={false}
        aria-label="Semana anterior"
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
      >
        <IconChevronLeft width={16} height={16} />
      </Link>
      <div className="grid grow grid-cols-7">
        {dias.map((chave, i) => {
          const ehHoje = chave === hojeKey;
          const selecionado = chave === diaKey;
          const total = contagem[chave] ?? 0;
          return (
            <Link
              key={chave}
              href={`/agenda?visao=dia&dia=${chave}`}
              scroll={false}
              aria-current={selecionado ? "date" : undefined}
              aria-label={`${DIAS_SEMANA_SEG[i]} ${Number(chave.slice(8))}${total ? `, ${total} horário${total === 1 ? "" : "s"}` : ""}`}
              className="flex flex-col items-center gap-1 py-0.5"
            >
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  selecionado || ehHoje ? "text-ink" : "text-ink-faint",
                )}
              >
                {DIAS_SEMANA_SEG[i]}
              </span>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center text-[14px] tabular-nums transition-colors",
                  ehHoje
                    ? "rounded-full bg-accent font-bold text-accent-ink"
                    : selecionado
                      ? "rounded-[11px] bg-accent-soft font-bold text-ink ring-2 ring-accent"
                      : "rounded-full font-medium text-ink",
                  ehHoje && selecionado && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                )}
              >
                {Number(chave.slice(8))}
              </span>
              <span className={cn("h-1 w-1 rounded-full", total > 0 ? "bg-accent/60" : "bg-transparent")} />
            </Link>
          );
        })}
      </div>
      <Link
        href={`/agenda?visao=dia&dia=${semanaSeguinteKey}`}
        scroll={false}
        aria-label="Próxima semana"
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
      >
        <IconChevronRight width={16} height={16} />
      </Link>
    </div>
  );
}
