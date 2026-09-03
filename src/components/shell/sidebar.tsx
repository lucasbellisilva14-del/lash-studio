"use client";

/** Navegação lateral do desktop (lg+). No celular vale a pílula inferior. */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBox,
  IconCalendar,
  IconChart,
  IconChat,
  IconCheck,
  IconHome,
  IconMoney,
  IconScissors,
  IconSettings,
  IconTrophy,
  IconUsers,
  IconWhatsApp,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Hoje", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/mensagens", label: "Mensagens", icon: IconChat },
  { href: "/financeiro", label: "Financeiro", icon: IconMoney },
  { href: "/conquistas", label: "Conquistas", icon: IconTrophy },
  { href: "/servicos", label: "Serviços", icon: IconScissors },
  { href: "/estoque", label: "Estoque", icon: IconBox },
  { href: "/relatorios", label: "Relatórios", icon: IconChart },
  { href: "/config", label: "Configurações", icon: IconSettings },
] as const;

export function Sidebar({
  studioName,
  professionalName,
  logoUrl,
  slug,
}: {
  studioName: string;
  professionalName: string;
  logoUrl: string | null;
  slug: string;
}) {
  const pathname = usePathname();
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/agendar/${slug}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // clipboard indisponível — sem drama
    }
  }

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-0 h-dvh border-r border-white/60 bg-surface/70 backdrop-blur-xl">
      {/* Identidade do estúdio */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt=""
            className="h-11 w-11 rounded-2xl object-cover border border-line bg-surface"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-gradient text-white font-display font-semibold text-lg shadow-[var(--shadow-pop)]">
            {studioName.trim().charAt(0).toUpperCase() || "L"}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-display font-semibold text-[17px] leading-5 text-accent-gradient truncate">
            {studioName}
          </p>
          <p className="text-xs text-ink-soft truncate">{professionalName}</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5" aria-label="Navegação principal">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent-strong"
                  : "text-ink-soft hover:bg-surface-sunken/70 hover:text-ink",
              )}
            >
              <Icon width={19} height={19} strokeWidth={active ? 2.1 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Link público de agendamento */}
      <div className="px-4 pb-5 pt-3">
        <button
          onClick={copiarLink}
          className="w-full flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left hover:bg-surface-sunken/60 transition-colors"
        >
          {copiado ? (
            <IconCheck width={17} height={17} className="text-success shrink-0" />
          ) : (
            <IconWhatsApp width={17} height={17} className="text-accent-strong shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink">
              {copiado ? "Link copiado ✓" : "Link de agendamento"}
            </span>
            <span className="block text-[11px] text-ink-faint truncate">
              /agendar/{slug}
            </span>
          </span>
        </button>
        <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-ink-faint">
          LashOS 💗
        </p>
      </div>
    </aside>
  );
}
