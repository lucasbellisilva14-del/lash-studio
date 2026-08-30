"use client";

/** Visão MÊS: grade calendário com bolinhas/contagem por dia. */
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
          const total = contagem[chave] ?? 0;
          return (
            <Link
              key={chave}
              href={`/agenda?visao=dia&dia=${chave}`}
              aria-label={`Ver dia ${chave.slice(8)}/${chave.slice(5, 7)}`}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5",
                "transition-colors hover:bg-surface-sunken",
                ehHoje && "bg-accent-soft ring-1 ring-accent/40",
                !doMes && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "text-[13px] leading-none tabular-nums",
                  ehHoje ? "font-semibold text-accent-strong" : "text-ink",
                )}
              >
                {Number(chave.slice(8))}
              </span>
              {total > 0 ? (
                total > 3 ? (
                  <span className="text-[10px] leading-none font-semibold text-accent-strong bg-accent-soft rounded-full px-1.5 py-0.5">
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
