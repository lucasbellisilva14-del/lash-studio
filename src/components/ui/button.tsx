import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-strong active:bg-accent-strong shadow-sm",
  secondary:
    "bg-surface text-ink border border-line hover:bg-background active:bg-background",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-sunken active:bg-surface-sunken",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-soft": "bg-danger-soft text-danger hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-12 px-5 text-base rounded-xl gap-2 w-full",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors select-none",
        "disabled:opacity-45 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
