/**
 * Preferências das Ferramentas guardadas neste aparelho (localStorage).
 * Lidas com useSyncExternalStore: o servidor desenha o padrão e o aparelho
 * troca pelo valor salvo logo em seguida, sem erro de hidratação.
 * Sem armazenamento (aba anônima, cota cheia), o valor vale só nesta visita.
 */
import { useCallback, useSyncExternalStore } from "react";

const memoria = new Map<string, string | null>();
const ouvintes = new Set<() => void>();

function ler(chave: string): string | null {
  if (memoria.has(chave)) return memoria.get(chave) ?? null;
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string | null): void {
  memoria.set(chave, valor);
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento: fica só na memória desta visita
  }
  for (const avisar of ouvintes) avisar();
}

function assinar(avisar: () => void): () => void {
  ouvintes.add(avisar);
  // Outra aba do app mudou o valor: relê do armazenamento.
  function aoMudarEmOutraAba(evento: StorageEvent) {
    if (evento.key === null) memoria.clear();
    else memoria.delete(evento.key);
    avisar();
  }
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

function lerNoServidor(): null {
  return null;
}

/** Texto guardado no aparelho (null = nunca definido) e a função que grava (null apaga). */
export function useGuardado(chave: string): [string | null, (valor: string | null) => void] {
  const valor = useSyncExternalStore(assinar, () => ler(chave), lerNoServidor);
  const definir = useCallback((novo: string | null) => gravar(chave, novo), [chave]);
  return [valor, definir];
}
