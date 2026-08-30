"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Chip tocável (seleção única ou múltipla) — touch-first. */
export function Chip({
  selected,
  onClick,
  children,
  small,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-medium transition-colors select-none",
        small ? "h-9 px-3 text-[13px]" : "h-10 px-3.5 text-sm",
        selected
          ? "bg-accent text-accent-ink border-accent shadow-sm"
          : "bg-surface text-ink-soft border-line active:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
