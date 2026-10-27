import { initials } from "@/lib/team-shared";
import { cn } from "@/lib/cn";

/**
 * Bolinha da profissional: a cor dela (dado da equipe, não tema) com as
 * iniciais em branco. As cores da equipe têm contraste AA para o branco.
 */
export function MemberAvatar({
  name,
  color,
  size = 40,
  muted = false,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  /** Desativada: some um pouco da lista. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em] text-white select-none",
        muted && "opacity-45",
        className,
      )}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials(name)}
    </span>
  );
}
