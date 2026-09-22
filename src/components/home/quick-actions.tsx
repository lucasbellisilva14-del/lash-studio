import Link from "next/link";
import {
  IconCalendar,
  IconCalendarX,
  IconChat,
  IconUsers,
} from "@/components/ui/icons";

/** Atalhos de 1 toque pros fluxos mais comuns — logo abaixo da saudação. */
const ACOES = [
  { href: "/agenda?novo=1", label: "Agendar", icon: IconCalendar },
  { href: "/clientes?nova=1", label: "Nova cliente", icon: IconUsers },
  { href: "/mensagens", label: "Mensagens", icon: IconChat },
  { href: "/agenda/bloqueios", label: "Bloqueio", icon: IconCalendarX },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACOES.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface border border-line shadow-[var(--shadow-card)] px-1 py-3 active:scale-95 transition-transform"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <Icon width={18} height={18} />
          </span>
          <span className="text-[11px] font-medium text-ink-soft leading-none text-center">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
