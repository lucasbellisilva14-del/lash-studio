import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";

/** Banner dom/seg: convite pro resumo semanal comemorativo. */
export function WeeklyRecapBanner() {
  return (
    <Link
      href="/semana"
      className="flex items-center gap-3 rounded-2xl bg-accent-gradient text-white px-4 py-3.5 shadow-[var(--shadow-pop)] active:scale-[0.99] transition-transform"
    >
      <span className="text-2xl" aria-hidden>🎉</span>
      <span className="min-w-0 grow">
        <span className="block font-semibold text-[15px] leading-5">
          Seu resumo da semana chegou!
        </span>
        <span className="block text-[13px] text-white/85">
          Veja seus números e compartilhe nos stories
        </span>
      </span>
      <IconChevronRight width={18} height={18} className="shrink-0 text-white/80" />
    </Link>
  );
}
