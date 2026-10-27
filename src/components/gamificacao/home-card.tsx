import Link from "next/link";
import type { Gamification } from "@/lib/domain/gamification";
import { IconChevronRight } from "@/components/ui/icons";

/** Card compacto da home: nível + progresso + medalha em destaque. */
export function GamificationHomeCard({ game }: { game: Gamification }) {
  return (
    <Link
      href="/conquistas"
      className="block rounded-[22px] bg-surface px-5 py-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] hover:bg-surface-muted active:scale-[0.99] transition-[transform,background-color]"
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[20px]"
          aria-hidden
        >
          {game.level.emoji}
        </span>
        <div className="min-w-0 grow">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">
              Nível {game.level.level} · {game.level.name}
            </p>
            <p className="shrink-0 text-[12px] tabular-nums text-ink-soft">
              {game.unlockedCount}/{game.totalCount} medalhas
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round(game.level.progress * 100)}%` }}
            />
          </div>
          {game.highlight ? (
            <p className="mt-1.5 truncate text-[12px] text-ink-soft">
              Última: {game.highlight.emoji} {game.highlight.title}
            </p>
          ) : null}
        </div>
        <IconChevronRight className="shrink-0 text-ink-faint" width={18} height={18} />
      </div>
    </Link>
  );
}
