import type { WeeklyChallenge } from "@/lib/domain/gamification";
import { cn } from "@/lib/cn";
import { IconCheck } from "@/components/ui/icons";

/** Desafios da semana com barra de progresso — calculados dos dados vivos. */
export function WeeklyChallenges({ weekly }: { weekly: WeeklyChallenge[] }) {
  return (
    <ul className="space-y-2.5">
      {weekly.map((c) => (
        <li
          key={c.key}
          className={cn(
            "rounded-2xl border px-4 py-3.5",
            c.done ? "border-success/25 bg-success-soft/60" : "border-line bg-surface",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0" aria-hidden>
              {c.emoji}
            </span>
            <div className="min-w-0 grow">
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                {c.title}
                {c.done ? <IconCheck width={14} height={14} className="text-success" /> : null}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">{c.description}</p>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-accent-strong bg-accent-soft rounded-full px-2 py-0.5">
              {c.xpLabel}
            </span>
          </div>
          {!c.done ? (
            <div className="mt-2.5 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.round(c.progress * 100)}%` }}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
