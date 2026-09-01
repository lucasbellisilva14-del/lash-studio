import { cn } from "@/lib/cn";

/** Barra horizontal proporcional em CSS puro — linha completa (label + valor + sub). */
export function BarRow({
  label,
  value,
  sub,
  pct,
}: {
  label: string;
  value: string;
  sub?: string;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-ink">{label}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{value}</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      {sub ? <p className="mt-1 text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}

/** Barra compacta para distribuições (dia da semana, faixa de hora). */
export function MiniBarRow({
  label,
  count,
  max,
  destaque = false,
}: {
  label: string;
  count: number;
  max: number;
  destaque?: boolean;
}) {
  const pct = max > 0 && count > 0 ? Math.max((count / max) * 100, 4) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "w-10 shrink-0 text-xs",
          destaque ? "font-semibold text-accent-strong" : "text-ink-soft",
        )}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn("h-full rounded-full", destaque ? "bg-accent" : "bg-accent/30")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "w-7 shrink-0 text-right text-xs tabular-nums",
          destaque ? "font-semibold text-ink" : "text-ink-soft",
        )}
      >
        {count}
      </span>
    </div>
  );
}
