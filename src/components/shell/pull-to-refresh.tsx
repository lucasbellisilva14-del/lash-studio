"use client";

/**
 * Pull-to-refresh do PWA: puxar a página pra baixo (já no topo) recarrega
 * os dados via router.refresh(). Indicador discreto no topo.
 */
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const LIMIAR = 78; // px de puxada pra disparar

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [puxada, setPuxada] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const origemY = useRef<number | null>(null);

  function aoIniciar(e: React.TouchEvent) {
    if (window.scrollY > 0 || atualizando) return;
    origemY.current = e.touches[0].clientY;
  }

  function aoMover(e: React.TouchEvent) {
    if (origemY.current === null || atualizando) return;
    const delta = e.touches[0].clientY - origemY.current;
    if (window.scrollY > 0 || delta <= 0) {
      setPuxada(0);
      return;
    }
    // resistência crescente, feel de elástico
    setPuxada(Math.min(110, delta * 0.45));
  }

  function aoSoltar() {
    if (origemY.current === null) return;
    origemY.current = null;
    if (puxada >= LIMIAR * 0.45) {
      setAtualizando(true);
      router.refresh();
      setTimeout(() => {
        setAtualizando(false);
        setPuxada(0);
      }, 900);
      return;
    }
    setPuxada(0);
  }

  const pronto = puxada >= LIMIAR * 0.45;

  return (
    <div onTouchStart={aoIniciar} onTouchMove={aoMover} onTouchEnd={aoSoltar}>
      <div
        aria-hidden={!atualizando && puxada === 0}
        className="flex justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: atualizando ? 44 : puxada }}
      >
        <span
          className={cn(
            "mt-2 h-7 w-7 rounded-full border-2 border-accent/30 border-t-accent",
            (atualizando || pronto) && "animate-spin",
          )}
          style={{
            transform: atualizando ? undefined : `rotate(${puxada * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  );
}
