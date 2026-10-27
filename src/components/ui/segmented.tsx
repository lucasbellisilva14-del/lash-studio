"use client";

/**
 * Controle segmentado (troca de modo: Dia/Semana/Mês, Já foi paga/Agendar...).
 * Trilho cinza, opção ativa branca e levantada. Com `name`, envia o valor no form.
 */
import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  className,
  size = "md",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid grid-flow-col auto-cols-fr gap-0.5 rounded-full bg-surface-sunken p-1",
        className,
      )}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-3 font-semibold whitespace-nowrap transition-[color,background-color,box-shadow] duration-150",
              size === "sm" ? "h-8 text-[12.5px]" : "h-9 text-[13.5px]",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgb(23_21_30/0.08),0_2px_8px_-3px_rgb(23_21_30/0.14)]"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
