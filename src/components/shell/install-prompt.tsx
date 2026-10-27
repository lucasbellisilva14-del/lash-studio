"use client";

/**
 * Convite discreto para instalar o app (Android via beforeinstallprompt), como
 * cartão da tela inicial — nunca flutuando por cima do conteúdo.
 * iOS não dispara o evento — mostramos a dica de "Adicionar à Tela de Início".
 */
import { useEffect, useState } from "react";
import { IconDownload, IconX } from "@/components/ui/icons";

const DISMISS_KEY = "lashos.installPromptDismissedAt";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return; // já instalado

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari: sem beforeinstallprompt — dica manual
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = "standalone" in navigator && (navigator as { standalone?: boolean }).standalone;
    if (isIos && !isStandalone) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // sem storage — só esconde nesta sessão
    }
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setDeferred(null);
    else dismiss();
  }

  if (!deferred && !showIosHint) return null;

  return (
    <div className="flex items-center gap-3.5 rounded-[22px] bg-surface px-5 py-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] lg:hidden">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
        <IconDownload width={18} height={18} />
      </span>
      <div className="min-w-0 grow">
        <p className="text-[15px] font-semibold text-ink">Instale o LashOS no celular</p>
        <p className="text-[13px] text-ink-soft">
          {deferred
            ? "Abre direto da tela inicial, como um app."
            : "No Safari: Compartilhar → Adicionar à Tela de Início."}
        </p>
      </div>
      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="h-9 shrink-0 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-ink"
        >
          Instalar
        </button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dispensar"
        className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-sunken hover:text-ink"
      >
        <IconX width={15} height={15} />
      </button>
    </div>
  );
}
