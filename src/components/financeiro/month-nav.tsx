import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/** Navegação ← mês → do financeiro (links, sem JS no cliente). */
export function MonthNav({
  monthLabel,
  prevHref,
  nextHref,
}: {
  monthLabel: string;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <nav
      aria-label="Navegar entre meses"
      className="mb-5 flex items-center justify-between rounded-2xl border border-line bg-surface px-1.5 py-1.5"
    >
      <Link
        href={prevHref}
        aria-label="Mês anterior"
        className="rounded-xl p-2.5 text-ink-soft transition-colors active:bg-surface-sunken"
      >
        <IconChevronLeft />
      </Link>
      <p className="font-display text-[15px] font-semibold text-ink">{monthLabel}</p>
      <Link
        href={nextHref}
        aria-label="Próximo mês"
        className="rounded-xl p-2.5 text-ink-soft transition-colors active:bg-surface-sunken"
      >
        <IconChevronRight />
      </Link>
    </nav>
  );
}
