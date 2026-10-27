import { cn } from "@/lib/cn";
import type { StatItem } from "./types";

const TONES = {
  ink: "text-ink",
  success: "text-success",
  danger: "text-danger",
} as const;

/**
 * Os números do painel: 2 colunas, 3 quando o conteúdo é largo. A troca é por
 * container query porque, no PC, a largura da coluna varia com o menu e o
 * resumo lateral. O valor encolhe junto com o cartão (cqi) para nunca cortar
 * nem vazar dinheiro.
 */
export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @xl:gap-4">
      {items.map((item) => (
        <div
          key={item.key}
          className="@container flex min-w-0 flex-col rounded-[22px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:p-5"
        >
          <dt className="text-[13px] font-semibold leading-snug text-ink">{item.label}</dt>
          <dd
            className={cn(
              "mt-2 whitespace-nowrap font-bold leading-none tracking-[-0.03em] tabular-nums",
              "text-[length:clamp(16px,13.5cqi,24px)]",
              TONES[item.tone ?? "ink"],
            )}
          >
            {item.value}
          </dd>
          <dd className="mt-2 text-[12px] leading-snug text-ink-soft">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
