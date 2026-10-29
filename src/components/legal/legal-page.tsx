import type { ReactNode } from "react";
import Link from "next/link";

/** Casca das páginas públicas de termos e privacidade: coluna de leitura, visual do app. */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh px-5 py-10 sm:py-14">
      <article className="mx-auto w-full max-w-2xl">
        <Link href="/" className="text-[13.5px] font-semibold text-ink-soft hover:text-ink">
          LashOS
        </Link>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">{title}</h1>
        <p className="mt-2 text-[13.5px] text-ink-soft">Atualizado em {updatedAt}</p>
        <div className="legal mt-8 space-y-6 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:tracking-[-0.02em] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_p]:text-ink-soft [&_li]:text-ink-soft [&_strong]:text-ink">
          {children}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-[13px] text-ink-faint">
          Dúvidas sobre estes termos: use &ldquo;Falar com o suporte&rdquo; dentro do app.
        </p>
      </article>
    </div>
  );
}
