"use client";

/**
 * Convite discreto para instalar o app (Android via beforeinstallprompt), como
 * cartão da tela inicial — nunca flutuando por cima do conteúdo.
 * No iPhone a Apple não deixa um site instalar sozinho: o botão "Como instalar"
 * abre o passo a passo de "Adicionar à Tela de Início".
 */
import { useEffect, useState } from "react";
import { IconDownload, IconX } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const PASSOS_IPHONE = [
  { t: "Toque em Compartilhar", s: "É o quadrado com a seta para cima, na barra do Safari." },
  { t: "Escolha “Adicionar à Tela de Início”", s: "Role a lista para baixo se não aparecer de primeira." },
  { t: "Toque em Adicionar", s: "O LashOS aparece na tela inicial e abre como um app." },
];

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
  const [passosAbertos, setPassosAbertos] = useState(false);

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
            : "Leva 10 segundos, pelo Safari."}
        </p>
      </div>
      <button
        type="button"
        onClick={deferred ? install : () => setPassosAbertos(true)}
        className="h-9 shrink-0 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-ink"
      >
        {deferred ? "Instalar" : "Como instalar"}
      </button>
      <Sheet
        open={passosAbertos}
        onClose={() => setPassosAbertos(false)}
        title="Instalar no iPhone"
        description="O iPhone só instala pelo menu do Safari. São três toques."
        footer={
          <Button className="w-full" onClick={() => setPassosAbertos(false)}>
            Entendi
          </Button>
        }
      >
        <ol className="space-y-4">
          {PASSOS_IPHONE.map((p, i) => (
            <li key={p.t} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[13px] font-bold text-ink">
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-ink">{p.t}</span>
                <span className="block text-[13px] leading-snug text-ink-soft">{p.s}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
          Abriu o LashOS por dentro do Instagram ou do WhatsApp? Toque nos três pontinhos e escolha
          “Abrir no Safari” antes.
        </p>
      </Sheet>
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
