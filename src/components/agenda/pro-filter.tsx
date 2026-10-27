/**
 * Filtro de profissional da agenda (só a dona com equipe): "Todas · Você ·
 * Ana · Bia", cada uma com a bolinha da sua cor. São links — o filtro vive na
 * URL (?prof=) e sobrevive à troca de dia e de visão.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ALL_KEY } from "@/lib/team-shared";
import { ProDot, agendaHref } from "./pro";
import type { AgendaPro, VisaoAgenda } from "./types";

export function ProFilterChips({
  equipe,
  filtroKey,
  visao,
  diaKey,
  rolavel = false,
  className,
}: {
  equipe: AgendaPro[];
  filtroKey: string;
  visao: VisaoAgenda;
  diaKey: string;
  /** Celular: uma linha que rola na horizontal, de ponta a ponta da tela. */
  rolavel?: boolean;
  className?: string;
}) {
  if (equipe.length < 2) return null;
  const itens: Array<{ key: string; rotulo: string; cor: string | null }> = [
    { key: ALL_KEY, rotulo: "Todas", cor: null },
    ...equipe.map((p) => ({ key: p.key, rotulo: p.rotulo, cor: p.cor })),
  ];

  return (
    <nav
      aria-label="Filtrar a agenda por profissional"
      className={cn(
        rolavel ? "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5" : "flex flex-wrap gap-2",
        className,
      )}
    >
      {itens.map((it) => {
        const ativo = it.key === filtroKey;
        return (
          <Link
            key={it.key}
            href={agendaHref(visao, diaKey, it.key === ALL_KEY ? null : it.key)}
            scroll={false}
            aria-current={ativo ? "true" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold",
              "transition-[color,background-color,border-color] duration-150",
              ativo
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-surface text-ink hover:border-line-strong",
            )}
          >
            {it.cor ? (
              <ProDot
                cor={it.cor}
                className={cn("ring-[1.5px]", ativo ? "ring-accent-ink" : "ring-surface")}
              />
            ) : null}
            {it.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
