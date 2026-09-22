"use client";

/**
 * Vitrine de trabalhos do estúdio: rolagem horizontal com snap +
 * lightbox simples ao tocar (foto em tamanho grande).
 */
import { useState } from "react";
import { IconX } from "@/components/ui/icons";

export type FotoVitrine = { id: string; thumbSrc: string; fullSrc: string };

export function Gallery({ fotos, nomeEstudio }: { fotos: FotoVitrine[]; nomeEstudio: string }) {
  const [aberta, setAberta] = useState<FotoVitrine | null>(null);

  if (fotos.length === 0) return null;

  return (
    <section className="mb-8" aria-label="Trabalhos do estúdio">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Trabalhos do estúdio ✨
      </p>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1">
        {fotos.map((f) => (
          <button
            key={f.id}
            onClick={() => setAberta(f)}
            className="snap-start shrink-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform"
            aria-label="Ampliar foto de trabalho"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.thumbSrc}
              alt={`Trabalho de ${nomeEstudio}`}
              loading="lazy"
              className="h-32 w-32 object-cover"
            />
          </button>
        ))}
      </div>

      {aberta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
        >
          <button
            aria-label="Fechar"
            onClick={() => setAberta(null)}
            className="absolute inset-0"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aberta.fullSrc}
            alt={`Trabalho de ${nomeEstudio}`}
            className="relative max-h-[82dvh] max-w-full rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => setAberta(null)}
            aria-label="Fechar foto"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
          >
            <IconX width={20} height={20} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
