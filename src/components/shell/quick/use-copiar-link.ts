"use client";

/**
 * Copia o link público para a área de transferência com aviso "Copiado"
 * que some sozinho. A origem (https://…) só existe no aparelho: o servidor
 * desenha só o caminho e o cliente completa sem erro de hidratação.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

function assinar() {
  return () => {};
}
function origemNoAparelho() {
  return window.location.origin;
}
function origemNoServidor() {
  return "";
}

export function useCopiarLink(linkPath: string | null) {
  const origem = useSyncExternalStore(assinar, origemNoAparelho, origemNoServidor);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const timer = setTimeout(() => setCopiado(false), 2200);
    return () => clearTimeout(timer);
  }, [copiado]);

  const copiar = useCallback(async () => {
    if (!linkPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${linkPath}`);
      setCopiado(true);
    } catch {
      // clipboard indisponível — sem drama
    }
  }, [linkPath]);

  const url = linkPath ? `${origem}${linkPath}` : null;
  /** Para mostrar na tela: sem o "https://". */
  const urlCurta = url ? url.replace(/^https?:\/\//, "") : null;

  return { url, urlCurta, copiado, copiar };
}
