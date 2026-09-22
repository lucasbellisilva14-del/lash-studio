"use client";

/**
 * Visão MÊS: grade calendário com bolinhas/contagem por dia.
 * Tocar num dia SELECIONA (círculo cheio) e mostra os atendimentos
 * dele logo abaixo — sem sair da visão de mês.
 */
import Link from "next/link";
import { WEEKDAYS_PT_SHORT } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function MonthGrid({
  chaves,
  contagem,
  diaKey,
  hojeKey,
}: {
  chaves: string[];
  contagem: Record<string, number>;
  diaKey: string;
  hojeKey: string;
}) {
  const mesPrefixo = diaKey.slice(0, 7);

  return (
    <div className="bg-surface border border-line rounded-2xl p-3">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_PT_SHORT.map((d) => (
          <span
            key={d}
            className="text-center text-[11px] font-medium text-ink-faint py-1"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {chaves.map((chave) => {
          const doMes = chave.startsWith(mesPrefixo);
          const ehHoje = chave === hojeKey;
          const selecionado = chave === diaKey;
          const total = contagem[chave] ?? 0;
          return (
            <Link
              key={chave}
              href={`/agenda?visao=mes&dia=${chave}`}
              scroll={false}
              aria-label={`Ver dia ${chave.slice(8)}/${chave.slice(5, 7)}`}
              aria-current={selecionado ? "date" : undefined}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5",
                "transition-colors",
                !selecionado && "hover:bg-surface-sunken",
                !selecionado && ehHoje && "bg-accent-soft",
                !doMes && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full text-[13px] leading-none tabular-nums transition-colors",
                  selecionado
                    ? "bg-accent text-white font-semibold shadow-sm"
                    : ehHoje
                      ? "font-semibold text-accent-strong ring-1 ring-accent/40"
                      : "text-ink",
                )}
              >
                {Number(chave.slice(8))}
              </span>
              {total > 0 ? (
                total > 3 ? (
                  <span
                    className={cn(
                      "text-[10px] leading-none font-semibold rounded-full px-1.5 py-0.5",
                      selecionado
                        ? "bg-accent text-white"
                        : "text-accent-strong bg-accent-soft",
                    )}
                  >
                    {total}
                  </span>
                ) : (
                  <span className="flex gap-0.5">
                    {Array.from({ length: total }, (_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent" />
                    ))}
                  </span>
                )
              ) : (
                <span className="h-1.5" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
