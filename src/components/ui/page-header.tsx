import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronLeft } from "@/components/ui/icons";

/**
 * Cabeçalho de página: título grande, uma linha dizendo para que a tela
 * serve e as ações à direita.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3 lg:mb-7">
      <div className="flex min-w-0 items-start gap-2.5">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] hover:text-ink transition-colors lg:mt-1.5"
          >
            <IconChevronLeft width={18} height={18} />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.035em] text-ink text-balance lg:text-[34px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-[62ch] text-[14px] leading-snug text-ink-soft">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2 pt-0.5 lg:pt-1.5">{action}</div> : null}
    </header>
  );
}
