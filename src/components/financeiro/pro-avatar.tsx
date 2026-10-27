/** Iniciais da profissional na cor dela (cores da equipe têm contraste AA com branco). */
export function ProAvatar({
  initials,
  color,
  size = 32,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.01em] text-accent-ink"
      style={{ backgroundColor: color, width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

/** Bolinha da cor da profissional (chips e listas). */
export function ProDot({ color, onAccent = false }: { color: string; onAccent?: boolean }) {
  return (
    <span
      aria-hidden
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: color,
        // No chip marcado (berinjela), um anel branco mantém a bolinha visível.
        boxShadow: onAccent ? "0 0 0 2px var(--accent-ink)" : undefined,
      }}
    />
  );
}
