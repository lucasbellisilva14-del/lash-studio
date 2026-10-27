import Link from "next/link";
import { IconChevronRight, IconSparkles } from "@/components/ui/icons";

/** Convite de dom/seg pro resumo da semana. */
export function WeeklyRecapBanner() {
  return (
    <Link
      href="/semana"
      className="flex items-center gap-3.5 rounded-[22px] bg-surface px-5 py-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] hover:bg-surface-muted active:scale-[0.99] transition-[transform,background-color]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
        <IconSparkles width={18} height={18} />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-[15px] font-semibold text-ink">Seu resumo da semana chegou</span>
        <span className="block text-[13px] text-ink-soft">Veja seus números e compartilhe nos stories</span>
      </span>
      <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
    </Link>
  );
}
