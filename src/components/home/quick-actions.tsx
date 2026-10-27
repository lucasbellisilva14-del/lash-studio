import Link from "next/link";
import {
  IconCalendarAdd,
  IconCalendarX,
  IconChat,
  IconUserAdd,
} from "@/components/ui/icons";

/** Atalhos de 1 toque pros fluxos mais comuns — logo abaixo do topo. */
const ACOES = [
  { href: "/agenda?novo=1", label: "Agendar", icon: IconCalendarAdd },
  { href: "/clientes?nova=1", label: "Nova cliente", icon: IconUserAdd },
  { href: "/mensagens", label: "Fila", icon: IconChat },
  { href: "/agenda/bloqueios", label: "Bloquear", icon: IconCalendarX },
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 lg:max-w-xl">
      {ACOES.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 rounded-[18px] bg-surface px-1 py-3.5 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] transition-[transform,background-color] hover:bg-surface-muted active:scale-[0.97]"
        >
          <Icon width={21} height={21} className="text-ink" />
          <span className="text-center text-[11.5px] font-semibold leading-none text-ink-soft">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
