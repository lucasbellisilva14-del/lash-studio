"use client";

/**
 * Largura do conteúdo no PC. A agenda usa a tela toda (mini calendário +
 * timeline) e esconde a coluna de resumo; as outras telas ficam numa
 * coluna confortável de leitura.
 */
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Só a agenda principal; bloqueios e lista de espera seguem a coluna normal. */
const TELAS_LARGAS = ["/agenda"];

function useTelaLarga() {
  const pathname = usePathname();
  return TELAS_LARGAS.includes(pathname);
}

export function ContentFrame({ children }: { children: ReactNode }) {
  const larga = useTelaLarga();
  return (
    <div className={cn("lg:flex-1 lg:min-w-0", larga ? "" : "lg:max-w-3xl xl:max-w-4xl")}>
      {children}
    </div>
  );
}

/** Esconde um bloco em telas que já mostram a mesma informação. */
export function HideOnRoutes({ routes, children }: { routes: string[]; children: ReactNode }) {
  const pathname = usePathname();
  if (routes.includes(pathname)) return null;
  return <>{children}</>;
}

export function RailSlot({ children }: { children: ReactNode }) {
  const larga = useTelaLarga();
  if (larga) return null;
  return <>{children}</>;
}
