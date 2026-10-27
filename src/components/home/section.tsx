import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";

/** Bloco de seção da home: título + link de ação opcional à direita. */
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
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors"
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
