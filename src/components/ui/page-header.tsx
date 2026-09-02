import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronLeft } from "@/components/ui/icons";

/** Cabeçalho de página: título display + ação opcional à direita. */
export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-2 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="mt-1 -ml-1.5 p-1.5 rounded-full text-ink-soft hover:bg-surface-sunken shrink-0"
          >
            <IconChevronLeft />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-8 font-semibold text-accent-gradient truncate pb-0.5">
            {title}
          </h1>
          {subtitle ? <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
