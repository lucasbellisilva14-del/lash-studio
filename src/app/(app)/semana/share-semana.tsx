"use client";

/** Compartilhar a semana: imagem 1080x1920 pros stories + texto via share nativo. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/ui/icons";

export function ShareSemana({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);

  async function compartilharImagem() {
    setGerando(true);
    try {
      const res = await fetch("/semana/imagem");
      const blob = await res.blob();
      const file = new File([blob], "minha-semana.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: texto });
        return;
      }
      // Sem share de arquivos (desktop): abre a imagem pra salvar
      window.open("/semana/imagem", "_blank", "noopener");
    } catch {
      // usuária cancelou o share — ok
    } finally {
      setGerando(false);
    }
  }

  async function compartilharTexto() {
    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // cancelado — ok
    }
  }

  return (
    <div className="mt-5 space-y-2.5">
      <Button size="lg" onClick={compartilharImagem} disabled={gerando}>
        {gerando ? "Preparando imagem..." : "📸 Compartilhar nos stories"}
      </Button>
      <Button size="lg" variant="secondary" onClick={compartilharTexto}>
        {copiado ? (
          <span className="inline-flex items-center gap-2">
            <IconCheck width={16} height={16} className="text-success" /> Texto copiado ✓
          </span>
        ) : (
          "Compartilhar como texto"
        )}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        Mostra pro mundo que o estúdio está voando 💗
      </p>
    </div>
  );
}
