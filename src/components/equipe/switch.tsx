"use client";

/**
 * Interruptor liga/desliga: berinjela quando ligado, trilho cinza quando não.
 * Com `name`, envia "1"/"0" no formulário (input escondido).
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  name,
  id,
  disabled,
  describedBy,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  describedBy?: string;
  /** Rótulo acessível quando não há <label> apontando para o botão. */
  label?: string;
}) {
  return (
    <>
      {name ? <input type="hidden" name={name} value={checked ? "1" : "0"} /> : null}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-45",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0.5 h-6 w-6 rounded-full bg-surface shadow-[0_1px_2px_rgb(23_21_30/0.2)] transition-transform duration-150",
            checked && "translate-x-5",
          )}
        />
      </button>
    </>
  );
}

/** Linha de configuração: rótulo e dica à esquerda, interruptor à direita. */
export function SwitchField({
  label,
  hint,
  checked,
  onChange,
  name,
  disabled,
  className,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-dica`;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[14.5px] font-semibold leading-snug text-ink">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {hint}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        describedBy={hint ? hintId : undefined}
      />
    </div>
  );
}
