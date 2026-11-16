"use client";

/**
 * Entrada suave ao rolar a página (sobe e aparece). Respeita "reduzir
 * movimento" e, sem IntersectionObserver, mostra direto.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Revelar({
  children,
  className,
  atraso = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Atraso em ms (para cartões em sequência). */
  atraso?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setVisivel(true), 0);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visivel ? `${atraso}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform] duration-[600ms] ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        visivel ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
