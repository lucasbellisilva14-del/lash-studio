"use client";

/**
 * Linha com gesto de deslizar (padrão WhatsApp/iOS Mail):
 * arrastar revela uma ação de cada lado; soltar além do limiar dispara.
 * Só intercepta arrasto claramente horizontal — rolagem vertical fica livre.
 */
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const LIMIAR_DISPARO = 72; // px de arrasto pra disparar a ação
const TRAVA_EIXO = 12; // px até decidir se o gesto é horizontal

export type SwipeAction = {
  label: string;
  icon: ReactNode;
  /** Classe de fundo do painel revelado (ex.: "bg-success"). */
  className: string;
  onTrigger: () => void;
};

export function SwipeRow({
  leftAction,
  rightAction,
  children,
}: {
  /** Revelada ao arrastar pra DIREITA (fica à esquerda). */
  leftAction?: SwipeAction;
  /** Revelada ao arrastar pra ESQUERDA (fica à direita). */
  rightAction?: SwipeAction;
  children: ReactNode;
}) {
  const [deltaX, setDeltaX] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const origem = useRef<{ x: number; y: number } | null>(null);
  const eixo = useRef<"h" | "v" | null>(null);

  function aoIniciar(e: React.TouchEvent) {
    const t = e.touches[0];
    origem.current = { x: t.clientX, y: t.clientY };
    eixo.current = null;
  }

  function aoMover(e: React.TouchEvent) {
    if (!origem.current) return;
    const t = e.touches[0];
    const dx = t.clientX - origem.current.x;
    const dy = t.clientY - origem.current.y;

    if (!eixo.current) {
      if (Math.abs(dx) < TRAVA_EIXO && Math.abs(dy) < TRAVA_EIXO) return;
      eixo.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (eixo.current === "h") setArrastando(true);
    }
    if (eixo.current !== "h") return;

    // Sem ação daquele lado, resiste (rubber band)
    const permitido =
      dx > 0 ? (leftAction ? dx : dx / 4) : rightAction ? dx : dx / 4;
    setDeltaX(Math.max(-120, Math.min(120, permitido)));
  }

  function aoSoltar() {
    if (eixo.current === "h") {
      if (deltaX >= LIMIAR_DISPARO && leftAction) leftAction.onTrigger();
      else if (deltaX <= -LIMIAR_DISPARO && rightAction) rightAction.onTrigger();
    }
    setDeltaX(0);
    setArrastando(false);
    origem.current = null;
    eixo.current = null;
  }

  const revelaEsquerda = deltaX > 0 && leftAction;
  const revelaDireita = deltaX < 0 && rightAction;

  return (
    <div className="relative overflow-hidden">
      {revelaEsquerda ? (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center pl-4 pr-8 text-white",
            leftAction.className,
          )}
          style={{ width: Math.abs(deltaX) + 24 }}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            {leftAction.icon}
            {Math.abs(deltaX) >= LIMIAR_DISPARO ? leftAction.label : null}
          </span>
        </div>
      ) : null}
      {revelaDireita ? (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4 pl-8 text-white",
            rightAction.className,
          )}
          style={{ width: Math.abs(deltaX) + 24 }}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            {Math.abs(deltaX) >= LIMIAR_DISPARO ? rightAction.label : null}
            {rightAction.icon}
          </span>
        </div>
      ) : null}

      <div
        className={cn("relative bg-surface", !arrastando && "transition-transform duration-200")}
        style={{ transform: `translateX(${deltaX}px)` }}
        onTouchStart={aoIniciar}
        onTouchMove={aoMover}
        onTouchEnd={aoSoltar}
        onTouchCancel={aoSoltar}
      >
        {children}
      </div>
    </div>
  );
}
