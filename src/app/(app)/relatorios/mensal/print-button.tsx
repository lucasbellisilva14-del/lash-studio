"use client";

import { Button } from "@/components/ui/button";

/** Abre o diálogo de impressão — "Salvar como PDF" no celular e no PC. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="shrink-0">
      Baixar PDF
    </Button>
  );
}
