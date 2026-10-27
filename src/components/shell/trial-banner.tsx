"use client";

/** Faixa do topo: teste grátis acabando ou mensalidade vencendo. Some por hoje no X. */
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { IconSparkles, IconX } from "@/components/ui/icons";

export type TrialBannerInfo = {
  key: string;
  text: string;
  detail: string;
  cta: string;
};

function chaveDoDia(key: string) {
  const d = new Date();
  return `lashos-banner-${key}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function TrialBanner({ info }: { info: TrialBannerInfo }) {
  // No servidor a faixa aparece; no aparelho, respeita o "fechar por hoje".
  const fechadoHoje = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("storage", avisar);
      return () => window.removeEventListener("storage", avisar);
    },
    () => {
      try {
        return localStorage.getItem(chaveDoDia(info.key)) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [fechado, setFechado] = useState(false);

  if (fechado || fechadoHoje) return null;

  function fechar() {
    setFechado(true);
    try {
      localStorage.setItem(chaveDoDia(info.key), "1");
    } catch {
      // sem armazenamento: some só nesta visita
    }
  }

  return (
    <div className="no-print border-b border-[color-mix(in_srgb,var(--warning)_14%,transparent)] bg-warning-soft">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5 lg:max-w-none lg:justify-center lg:px-10">
        <IconSparkles width={17} height={17} className="hidden shrink-0 text-warning sm:block" />
        <p className="min-w-0 grow text-[13px] leading-snug text-ink lg:grow-0">
          <span className="font-semibold">{info.text}</span>{" "}
          <span className="hidden text-ink-soft sm:inline">{info.detail}</span>
        </p>
        <Link
          href="/assinatura"
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-hover transition-colors"
        >
          {info.cta}
        </Link>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar aviso por hoje"
          className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-[color-mix(in_srgb,var(--warning)_10%,transparent)]"
        >
          <IconX width={15} height={15} />
        </button>
      </div>
    </div>
  );
}
