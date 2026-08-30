import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";

/** Bloco de seção da home: título display + link de ação opcional à direita. */
export function HomeSection({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-accent-strong hover:opacity-80 transition-opacity"
          >
            {actionLabel}
            <IconChevronRight width={14} height={14} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
