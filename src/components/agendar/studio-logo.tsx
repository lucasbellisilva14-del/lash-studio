"use client";

/** Logo do estúdio com fallback elegante (monograma na cor de acento). */
import { useState } from "react";

export function StudioLogo({ src, nome }: { src: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  const inicial = nome.trim().charAt(0).toUpperCase() || "L";

  if (!src || falhou) {
    return (
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-sm"
        aria-hidden
      >
        <span className="font-display text-3xl font-semibold text-accent-ink">
          {inicial}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo de ${nome}`}
      onError={() => setFalhou(true)}
      className="mx-auto h-20 w-20 rounded-3xl border border-line bg-surface object-cover shadow-sm"
    />
  );
}
