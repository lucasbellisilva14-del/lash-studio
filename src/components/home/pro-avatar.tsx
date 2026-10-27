/**
 * Quem atende, em miniatura: iniciais brancas na cor da profissional (as
 * cores da equipe têm contraste AA para texto branco). Sem hooks: serve em
 * server e client components. Só aparece com equipe ativa.
 */
import { cn } from "@/lib/cn";
import { initials } from "@/lib/team-shared";

/** Dados prontos para exibir (server → client). */
export type ProView = {
  name: string;
  color: string;
  /** "Você", "Ana", "com Ana"... já no formato da tela. */
  label: string;
};

export function ProAvatar({
  name,
  color,
  size = 20,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none tracking-[-0.02em] text-white",
        className,
      )}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: Math.max(8, Math.round(size * 0.42)),
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Avatar + nome curto numa linha de texto (herda tamanho e cor do texto). */
export function ProTag({
  pro,
  size = 18,
  className,
}: {
  pro: ProView;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <ProAvatar name={pro.name} color={pro.color} size={size} />
      <span className="truncate">{pro.label}</span>
    </span>
  );
}

/** Selo neutro em pílula ("com Ana") para listas como a Fila. */
export function ProChip({ pro, className }: { pro: ProView; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-40 items-center gap-1.5 rounded-full bg-surface-sunken pl-1 pr-2.5 text-[12px] font-semibold text-ink-soft",
        className,
      )}
    >
      <ProAvatar name={pro.name} color={pro.color} size={16} />
      <span className="truncate">{pro.label}</span>
    </span>
  );
}
