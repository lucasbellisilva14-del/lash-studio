import type { LevelInfo } from "@/lib/domain/gamification";

/** Card-herói do nível: gradiente pink, XP e progresso até o próximo nível. */
export function LevelCard({ level }: { level: LevelInfo }) {
  return (
    <div className="bg-accent-gradient text-white rounded-3xl p-5 shadow-lg shadow-accent/25">
      <div className="flex items-center gap-4">
        <span className="text-4xl drop-shadow-sm" aria-hidden>
          {level.emoji}
        </span>
        <div className="min-w-0 grow">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
            Nível {level.level}
          </p>
          <p className="font-display text-2xl font-semibold leading-7 truncate">{level.name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-2xl font-semibold leading-6">{level.xp}</p>
          <p className="text-[11px] font-medium opacity-80">XP</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2.5 rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/90 transition-[width] duration-700"
            style={{ width: `${Math.round(level.progress * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs opacity-85">
          {level.xpForNext
            ? `${level.xpIntoLevel} / ${level.xpForNext} XP — faltam ${level.xpForNext - level.xpIntoLevel} para o próximo nível`
            : "Nível máximo — você é lenda! 🌟"}
        </p>
      </div>
    </div>
  );
}
