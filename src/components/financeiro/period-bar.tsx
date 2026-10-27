import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { PendingLink } from "./pending-link";

/** Classes do Chip do kit, para links (o Chip do kit é botão). */
export function chipLinkClasses(selected: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-[14px] font-semibold whitespace-nowrap",
    "transition-[color,background-color,border-color] duration-150",
    selected
      ? "border-accent bg-accent text-accent-ink"
      : "border-line bg-surface text-ink hover:border-line-strong",
  );
}

/**
 * Período do Financeiro: ← mês → e o atalho "Este mês" (marcado quando é o
 * mês corrente). Tudo por link: o mês fica na URL (?mes=yyyy-MM).
 */
export function PeriodBar({
  label,
  prevHref,
  nextHref,
  thisMonthHref,
  isCurrent,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  thisMonthHref: string;
  isCurrent: boolean;
}) {
  const seta =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink";

  return (
    <div className="flex items-center gap-2">
      <nav
        aria-label="Escolher o mês"
        className="flex min-w-0 grow items-center justify-between gap-1 rounded-full bg-surface p-1 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:grow-0"
      >
        <PendingLink href={prevHref} aria-label="Mês anterior" className={seta}>
          <IconChevronLeft width={18} height={18} />
        </PendingLink>
        <p className="min-w-0 truncate px-1 text-center text-[14.5px] font-semibold tracking-[-0.01em] text-ink sm:w-44">
          {label}
        </p>
        <PendingLink href={nextHref} aria-label="Próximo mês" className={seta}>
          <IconChevronRight width={18} height={18} />
        </PendingLink>
      </nav>

      {isCurrent ? (
        <span className={chipLinkClasses(true)}>Este mês</span>
      ) : (
        <PendingLink href={thisMonthHref} className={chipLinkClasses(false)}>
          Este mês
        </PendingLink>
      )}
    </div>
  );
}
