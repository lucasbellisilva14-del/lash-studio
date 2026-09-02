"use client";

/**
 * Convite discreto para instalar o app (Android/desktop via beforeinstallprompt).
 * iOS não dispara o evento — mostramos a dica de "Adicionar à Tela de Início".
 */
import { useEffect, useState } from "react";
import { IconX } from "@/components/ui/icons";

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
    <div className="fixed z-30 inset-x-4 bottom-[calc(96px+env(safe-area-inset-bottom))] mx-auto max-w-lg">
      <div className="flex items-center gap-3 rounded-2xl bg-accent text-accent-ink shadow-lg px-4 py-3">
        <div className="grow min-w-0">
          <p className="text-sm font-medium">Instale o LashOS no seu celular</p>
          <p className="text-xs opacity-85">
            {deferred
              ? "Abre direto da tela inicial, como um app."
              : "No Safari: Compartilhar → Adicionar à Tela de Início."}
          </p>
        </div>
        {deferred ? (
          <button
            onClick={install}
            className="shrink-0 h-9 px-3.5 rounded-lg bg-white/15 text-sm font-semibold"
          >
            Instalar
          </button>
        ) : null}
        <button onClick={dismiss} aria-label="Dispensar" className="shrink-0 p-1.5 opacity-80">
          <IconX width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
