"use client";

/**
 * Memória de rolagem: ao sair de uma tela por um link, guarda onde ela
 * estava; ao VOLTAR para ela (botão "Voltar" do cabeçalho ou o voltar do
 * aparelho), retoma do mesmo ponto. Entrar numa tela pelo menu continua
 * abrindo no topo — menos os menus (Mais, Configurações), que sempre
 * reabrem onde ela parou, como as abas de um app nativo.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHAVE = "lashos:rolagem";
const VOLTANDO = "lashos:voltando";
/** Telas-menu: quem sai delas para um item volta pelo menu inferior, sem botão "Voltar". */
const MENUS = ["/mais", "/config"];

function ler(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function guardar(caminho: string, y: number) {
  try {
    const mapa = ler();
    mapa[caminho] = Math.round(y);
    sessionStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    // armazenamento indisponível: segue sem memória
  }
}

export function ScrollMemory() {
  const pathname = usePathname();

  // Guarda a posição no instante em que ela toca num link; marca quando é um "voltar".
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      guardar(window.location.pathname, window.scrollY);
      try {
        if (link.hasAttribute("data-voltar")) sessionStorage.setItem(VOLTANDO, "1");
        else sessionStorage.removeItem(VOLTANDO);
      } catch {
        // sem armazenamento
      }
    }
    function aoVoltarDoAparelho() {
      try {
        sessionStorage.setItem(VOLTANDO, "1");
      } catch {
        // sem armazenamento
      }
    }
    document.addEventListener("click", aoClicar, true);
    window.addEventListener("popstate", aoVoltarDoAparelho);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      window.removeEventListener("popstate", aoVoltarDoAparelho);
    };
  }, []);

  // Chegou numa tela voltando: retoma o ponto guardado (espera o conteúdo ter altura).
  useEffect(() => {
    let voltando = false;
    try {
      voltando = sessionStorage.getItem(VOLTANDO) === "1";
      sessionStorage.removeItem(VOLTANDO);
    } catch {
      // sem armazenamento
    }
    const y = voltando || MENUS.includes(pathname) ? ler()[pathname] : undefined;
    if (!y) return;

    // A tela nova entra em etapas (esqueleto, depois o conteúdo) e o Next rola
    // para o topo quando ela assenta: segura o ponto por um instante, até ela
    // encostar o dedo na tela.
    const fim = performance.now() + 1500;
    let quadro = 0;
    let solto = false;
    const soltar = () => {
      solto = true;
    };
    const tentar = () => {
      if (solto || performance.now() > fim) return;
      const alcance = document.documentElement.scrollHeight - window.innerHeight;
      if (alcance >= y && Math.abs(window.scrollY - y) > 2) {
        window.scrollTo({ top: y, behavior: "instant" });
      }
      quadro = requestAnimationFrame(tentar);
    };
    quadro = requestAnimationFrame(tentar);
    window.addEventListener("touchstart", soltar, { passive: true });
    window.addEventListener("wheel", soltar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("touchstart", soltar);
      window.removeEventListener("wheel", soltar);
    };
  }, [pathname]);

  return null;
}
