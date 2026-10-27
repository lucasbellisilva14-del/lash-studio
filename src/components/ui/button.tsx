import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft" | "success-soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover shadow-[0_1px_2px_rgb(23_21_30/0.14)] active:scale-[0.98]",
  secondary:
    "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-muted active:scale-[0.98]",
  ghost: "bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink active:bg-surface-sunken",
  danger: "bg-danger text-white hover:brightness-95 active:scale-[0.98]",
  "danger-soft": "bg-danger-soft text-danger hover:brightness-[0.97] active:scale-[0.98]",
  "success-soft": "bg-success-soft text-success hover:brightness-[0.97] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[14.5px] gap-2",
  lg: "h-12 px-6 text-[15px] gap-2 w-full",
};

/** Classes de botão para usar em <Link> e <a> com o mesmo visual. */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.01em] select-none",
    "transition-[color,background-color,border-color,transform,filter] duration-150",
    "disabled:opacity-45 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
