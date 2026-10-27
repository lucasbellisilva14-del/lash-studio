"use client";

/**
 * Link de filtro do Financeiro (mês, profissional): a página é dinâmica, então
 * o conteúdo do link esmaece enquanto a navegação carrega. Sem salto de layout.
 */
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

function Conteudo({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-opacity duration-150",
        pending && "opacity-45",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PendingLink({
  children,
  innerClassName,
  ...props
}: ComponentProps<typeof Link> & { innerClassName?: string }) {
  return (
    <Link scroll={false} {...props}>
      <Conteudo className={innerClassName}>{children}</Conteudo>
    </Link>
  );
}
