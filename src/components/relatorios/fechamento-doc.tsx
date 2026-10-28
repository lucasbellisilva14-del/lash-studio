/**
 * Peças do documento "Fechamento do mês" (tela e impressão / Salvar como PDF):
 * cabeçalho com a identidade do estúdio, caixas de número, seções e rodapé.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Contêiner do documento: cartão na tela, folha limpa na impressão. */
export function DocFolha({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 print:border-0 print:p-0 print:rounded-none">
      {children}
    </div>
  );
}

/** Logo (ou inicial) + nome do estúdio, do que se trata e a data de emissão. */
export function DocCabecalho({
  studioName,
  logoUrl,
  subtitulo,
  emitidoEm,
}: {
  studioName: string;
  logoUrl: string | null;
  subtitulo: string;
  /** "dd/MM/yyyy" no fuso do estúdio. */
  emitidoEm: string;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-line pb-5">
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoUrl}
          alt=""
          className="h-14 w-14 rounded-2xl object-cover border border-line"
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white font-display text-xl font-bold tracking-[-0.03em]">
          {studioName.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 grow">
        <p className="font-display text-xl font-bold tracking-[-0.03em] text-ink">
          {studioName}
        </p>
        <p className="text-sm text-ink-soft">{subtitulo}</p>
      </div>
      <p className="text-xs text-ink-faint shrink-0">
        Emitido em {emitidoEm}
      </p>
    </header>
  );
}

export function DocRodape() {
  return (
    <footer className="border-t border-line pt-4 text-center text-xs text-ink-faint">
      Relatório gerado pelo LashOS
    </footer>
  );
}

/** Seção do documento: título, uma linha opcional de contexto e o conteúdo. */
export function DocSecao({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("border-t border-line py-5", className)}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-ink-soft">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Caixa de número do resumo (mesmo tom das caixas do fechamento do estúdio).
 * O valor encolhe com a caixa (cqi) para R$ 12.345,67 caber num celular; na
 * impressão, um fio no lugar do fundo (fundos não saem no PDF por padrão).
 */
export function DocNumero({
  label,
  value,
  hint,
  destaque = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  /** O número que o documento existe para mostrar (ex.: a comissão a pagar). */
  destaque?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@container min-w-0 rounded-xl p-3.5 break-inside-avoid print:border",
        destaque
          ? "bg-surface ring-1 ring-line-strong print:border-ink print:ring-0"
          : "bg-surface-sunken/60 print:border-line",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p
        className={cn(
          "mt-0.5 whitespace-nowrap font-display font-bold tracking-[-0.03em] text-ink tabular-nums",
          destaque ? "text-[length:clamp(16px,11cqi,26px)]" : "text-[length:clamp(14px,12.5cqi,20px)]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</p> : null}
    </div>
  );
}
