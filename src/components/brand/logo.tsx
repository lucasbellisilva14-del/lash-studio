/**
 * Marca do LashOS: o cílio (lavanda no fundo berinjela) e o nome.
 * Usada nas páginas públicas: landing, login, cadastro.
 */
import { cn } from "@/lib/cn";

/** Cores da marca nas páginas públicas (fundo da logo e o cílio). */
export const MARCA = {
  noite: "#1d1729",
  brilho: "#4a3d6e",
  lavanda: "#cfc6ea",
  berinjela: "#2a2240",
} as const;

export function LashMark({
  className,
  color = MARCA.lavanda,
  strokeWidth = 1.8,
}: {
  className?: string;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M4 9c2.5 3.5 13.5 3.5 16 0" />
      <path d="M6 11.2 4.8 13M9.2 12.4l-.7 2M12 12.8v2.1M14.8 12.4l.7 2M18 11.2l1.2 1.8" />
    </svg>
  );
}

/** Cílio + "LashOS" lado a lado (cabeçalhos). `tom` = cor do fundo onde aparece. */
export function LashLogo({
  tom = "escuro",
  grande = false,
  className,
}: {
  tom?: "escuro" | "claro";
  grande?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LashMark className={grande ? "h-11 w-11" : "h-8 w-8"} color={tom === "escuro" ? MARCA.lavanda : MARCA.berinjela} strokeWidth={2} />
      <span
        className={cn(
          grande ? "text-[30px] font-extrabold tracking-[-0.045em]" : "text-[22px] font-extrabold tracking-[-0.045em]",
          tom === "escuro" ? "text-white" : "text-ink",
        )}
      >
        LashOS
      </span>
    </span>
  );
}
