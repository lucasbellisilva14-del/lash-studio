/**
 * Campos das calculadoras, montados sobre o Input do kit:
 * dinheiro com "R$" fixo e número com unidade ("%", "h"), mais as ações
 * em linha que aparecem dentro das dicas.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type CampoProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  /** Largura e posição (vai no invólucro). */
  className?: string;
  inputClassName?: string;
};

/** Dinheiro: aceita "250", "250,00" ou "1.250,00". */
export function CampoDinheiro({ className, inputClassName, ...props }: CampoProps) {
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint"
      >
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("pl-10 tabular-nums", inputClassName)}
        {...props}
      />
    </div>
  );
}

/** Número com unidade fixa à direita. */
export function CampoComUnidade({
  unidade,
  className,
  inputClassName,
  ...props
}: CampoProps & { unidade: string }) {
  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("pr-9 tabular-nums", inputClassName)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint"
      >
        {unidade}
      </span>
    </div>
  );
}

const linkDaDica =
  "font-semibold text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-ink";

/** Ação curta dentro de uma dica ("Voltar para R$ 1.250,00"). */
export function AcaoNaDica({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(linkDaDica, className)} {...props} />;
}

/** Link dentro de uma dica ("defina seus horários"). */
export function LinkNaDica({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkDaDica}>
      {children}
    </Link>
  );
}
