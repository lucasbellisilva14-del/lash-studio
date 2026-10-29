"use client";

/**
 * Copiar texto no aparelho, com o aviso "Copiado" que some sozinho.
 * Usado pelas abas Cobrança, Divulgação e pelas respostas prontas.
 */
import { useCallback, useEffect, useState } from "react";

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // sem Clipboard API (navegador antigo ou sem https): tenta o jeito clássico
  }
  try {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    campo.remove();
    return ok;
  } catch {
    return false;
  }
}

export type EstadoCopia = { id: string; ok: boolean; vez: number } | null;

/**
 * Estado de "Copiado" por item (id) que some depois de 2,4 s.
 * `copiar(id, texto)` copia e marca; `copia` diz qual item foi e se deu certo.
 */
export function useCopiar(): [EstadoCopia, (id: string, texto: string) => Promise<void>] {
  const [copia, setCopia] = useState<EstadoCopia>(null);

  useEffect(() => {
    if (!copia) return;
    const timer = setTimeout(() => setCopia(null), 2400);
    return () => clearTimeout(timer);
  }, [copia]);

  const copiar = useCallback(async (id: string, texto: string) => {
    const ok = await copiarTexto(texto);
    setCopia((anterior) => ({ id, ok, vez: (anterior?.vez ?? 0) + 1 }));
  }, []);

  return [copia, copiar];
}
