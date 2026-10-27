"use client";

/**
 * Abas de página em pílula, com contador. Funciona com links (href) ou
 * estado local (onChange). A ativa fica preenchida na cor de ação.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = {
  key: string;
  label: string;
  count?: number;
  href?: string;
};

export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel = "Seções",
}: {
  items: TabItem[];
  value: string;
  onChange?: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full gap-0.5 overflow-x-auto no-scrollbar rounded-full bg-surface p-1 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] w-fit",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        const inner = (
          <>
            <span>{item.label}</span>
            {item.count !== undefined ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-surface-sunken text-ink-soft",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </>
        );
        const cls = cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors",
          active ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink hover:bg-surface-sunken",
        );
        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={active}
            scroll={false}
            className={cls}
          >
            {inner}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.key)}
            className={cls}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
