import type { ReactNode } from "react";

/** Seção do relatório: título em caixa alta + conteúdo. */
export function ReportSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-1.5 px-0.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
        {subtitle ? (
          <span className="font-normal normal-case tracking-normal">· {subtitle}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
