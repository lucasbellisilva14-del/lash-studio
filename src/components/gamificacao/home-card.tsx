import Link from "next/link";
import type { Gamification } from "@/lib/domain/gamification";
import { IconChevronRight } from "@/components/ui/icons";

/** Card compacto da home: nível + progresso + medalha em destaque. */
export function GamificationHomeCard({ game }: { game: Gamification }) {
  return (
    <Link
      href="/conquistas"
      className="block bg-accent-gradient text-white rounded-2xl px-4 py-3.5 shadow-md shadow-accent/20 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {game.level.emoji}
        </span>
        <div className="min-w-0 grow">
          <p className="text-sm font-semibold leading-4">
            Nível {game.level.level} · {game.level.name}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90"
              style={{ width: `${Math.round(game.level.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] opacity-85">
            {game.unlockedCount}/{game.totalCount} medalhas
            {game.highlight ? ` · última: ${game.highlight.emoji} ${game.highlight.title}` : ""}
          </p>
        </div>
        <IconChevronRight className="shrink-0 opacity-80" width={18} height={18} />
      </div>
    </Link>
  );
}
