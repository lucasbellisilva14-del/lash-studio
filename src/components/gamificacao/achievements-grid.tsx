import type { Achievement } from "@/lib/domain/gamification";
import { cn } from "@/lib/cn";

/** Grade de conquistas: desbloqueadas em cor, bloqueadas suaves com progresso. */
export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-5 gap-2.5">
      {achievements.map((a) => (
        <div
          key={a.key}
          className={cn(
            "rounded-2xl border p-3 text-center flex flex-col items-center gap-1",
            a.unlocked
              ? "border-accent/30 bg-accent-soft"
              : "border-line bg-surface opacity-80",
          )}
        >
          <span
            className={cn("text-2xl", !a.unlocked && "grayscale opacity-50")}
            aria-hidden
          >
            {a.emoji}
          </span>
          <p className="text-[11px] font-semibold leading-tight text-ink">{a.title}</p>
          {a.unlocked ? (
            <p className="text-[10px] font-medium text-accent-strong">Conquistado ✓</p>
          ) : (
            <>
              <div className="w-full h-1 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/60"
                  style={{ width: `${Math.round(a.progress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-faint">
                {a.current}/{a.target}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
