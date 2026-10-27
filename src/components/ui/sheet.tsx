"use client";

/**
 * Sheet: sobe de baixo no celular e vira diálogo centralizado a partir de 640px.
 * Uso: <Sheet open onClose title description footer={<Botões/>}> conteúdo </Sheet>
 * O `footer` fica fixo embaixo, fora da rolagem — a ação principal nunca some.
 */
import { useEffect, useId, type ReactNode } from "react";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  tall,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Uma linha dizendo o que o formulário faz. */
  description?: ReactNode;
  /** Rodapé fixo (resumo + botões). */
  footer?: ReactNode;
  children: ReactNode;
  /** Ocupa quase a tela toda (formulários longos). */
  tall?: boolean;
  /** "lg" para formulários largos no PC. */
  size?: "md" | "lg";
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-6">
      <button
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 bg-[rgb(23_21_30/0.34)] fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative w-full bg-surface rounded-t-[28px] sm:rounded-[28px] shadow-[var(--shadow-modal)]",
          "flex flex-col overflow-hidden sheet-in",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
          tall ? "max-h-[92dvh] h-[92dvh] sm:h-auto sm:max-h-[88dvh]" : "max-h-[88dvh]",
          footer ? "" : "pb-safe",
        )}
      >
        <div className="relative flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6 shrink-0">
          <div aria-hidden className="absolute left-1/2 -translate-x-1/2 top-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
          <div className="min-w-0 pt-1">
            {title ? (
              <h2 id={titleId} className="text-[18px] font-bold tracking-[-0.02em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink transition-colors"
          >
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className={cn("overflow-y-auto px-5 sm:px-6 grow", footer ? "py-5" : "pt-5 pb-6")}>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-5 py-3.5 sm:px-6 pb-[max(14px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
