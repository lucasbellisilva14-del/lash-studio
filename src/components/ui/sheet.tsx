"use client";

/**
 * Sheet: sobe de baixo no celular e vira diálogo centralizado a partir de 640px.
 * Uso: <Sheet open onClose title description footer={<Botões/>}> conteúdo </Sheet>
 * O `footer` fica fixo embaixo, fora da rolagem — a ação principal nunca some.
 * Renderiza direto no <body> (portal): fica por cima do menu inferior em
 * qualquer tela. No celular, arrastar o topo para baixo fecha.
 */
import { useEffect, useId, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { createPortal } from "react-dom";
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
  // Arrastar o topo para baixo (celular): acompanha o dedo e fecha ao passar do limite.
  const [arrasto, setArrasto] = useState(0);
  const [tocou, setTocou] = useState(false);
  // Abriu ou fechou: zera o arrasto (a próxima abertura volta a animar).
  const [abertoAntes, setAbertoAntes] = useState(open);
  if (open !== abertoAntes) {
    setAbertoAntes(open);
    setTocou(false);
    setArrasto(0);
  }
  const origemY = useRef<number | null>(null);

  function aoPegar(e: TouchEvent) {
    origemY.current = e.touches[0].clientY;
    setTocou(true);
  }
  function aoArrastar(e: TouchEvent) {
    if (origemY.current === null) return;
    setArrasto(Math.max(0, e.touches[0].clientY - origemY.current));
  }
  function aoLargar() {
    if (origemY.current === null) return;
    origemY.current = null;
    const fechar = arrasto > 90;
    setArrasto(0);
    if (fechar) onClose();
  }
  // Os toques daqui não sobem para a página (senão o "puxar para atualizar" dispara).
  const segurar = (e: TouchEvent) => e.stopPropagation();

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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-6"
      onTouchStart={segurar}
      onTouchMove={segurar}
      onTouchEnd={segurar}
    >
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
        style={
          tocou
            ? {
                transform: `translateY(${arrasto}px)`,
                animation: "none",
                transition: arrasto === 0 ? "transform 180ms ease-out" : undefined,
              }
            : undefined
        }
      >
        <div
          className="relative flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6 shrink-0 touch-none sm:touch-auto"
          onTouchStart={aoPegar}
          onTouchMove={aoArrastar}
          onTouchEnd={aoLargar}
          onTouchCancel={aoLargar}
        >
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
        <div className={cn("overflow-y-auto overscroll-contain px-5 sm:px-6 grow", footer ? "py-5" : "pt-5 pb-6")}>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line bg-surface px-5 py-3.5 sm:px-6 pb-[max(14px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
