import type { ButtonHTMLAttributes } from "react";
import { IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Botão flutuante de ação principal (acima da bottom nav). */
export function Fab({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button
      aria-label={label ?? "Adicionar"}
      className={cn(
        "fixed z-40 bottom-[calc(96px+env(safe-area-inset-bottom))] right-4",
        "h-14 rounded-full bg-accent-gradient text-accent-ink shadow-[var(--shadow-pop)]",
        "flex items-center justify-center gap-2 px-4 active:scale-95 transition-transform",
        className,
      )}
      {...props}
    >
      <IconPlus width={22} height={22} />
      {label ? <span className="font-medium text-[15px] pr-1">{label}</span> : null}
    </button>
  );
}
