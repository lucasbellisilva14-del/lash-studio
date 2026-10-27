import { cn } from "@/lib/cn";

/** Número de painel: nome, valor e uma linha que explica o que ele mede. */
export function Stat({
  label,
  value,
  hint,
  tone = "ink",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "success" | "danger";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:p-5",
        className,
      )}
    >
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12px] leading-snug text-ink-soft">{hint}</p> : null}
    </div>
  );
}
