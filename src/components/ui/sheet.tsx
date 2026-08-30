"use client";

/**
 * Sheet inferior mobile-first (modal). Controlado por estado do pai.
 * Uso: <Sheet open={open} onClose={...} title="..."> conteúdo </Sheet>
 */
import { useEffect, type ReactNode } from "react";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Ocupa quase a tela toda (formulários longos). */
  tall?: boolean;
}) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-xl",
          "flex flex-col overflow-hidden pb-safe",
          tall ? "max-h-[92dvh] h-[92dvh] sm:h-auto sm:max-h-[85dvh]" : "max-h-[85dvh]",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1 w-10 rounded-full bg-line sm:hidden" />
          <h2 className="font-display text-lg font-semibold text-ink mt-1">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 -mr-2 rounded-full text-ink-faint hover:bg-surface-sunken"
          >
            <IconX width={18} height={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 grow">{children}</div>
      </div>
    </div>
  );
}
