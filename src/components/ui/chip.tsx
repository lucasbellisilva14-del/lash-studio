import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Escolha rápida em pílula (duração, tipo, atalhos). Marcada = preenchida. */
export function Chip({
  selected = false,
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold whitespace-nowrap transition-[color,background-color,border-color] duration-150",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[14px]",
        selected
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-ink hover:border-line-strong",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}
