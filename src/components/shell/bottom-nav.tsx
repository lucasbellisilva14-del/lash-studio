"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconChat,
  IconHome,
  IconMoney,
  IconMore,
  IconUsers,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Hoje", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/mensagens", label: "Mensagens", icon: IconChat },
  { href: "/financeiro", label: "Financeiro", icon: IconMoney },
  { href: "/mais", label: "Mais", icon: IconMore },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-safe"
    >
      <div className="mx-auto max-w-lg grid grid-cols-6">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-w-0",
                active ? "text-accent" : "text-ink-faint hover:text-ink-soft",
              )}
            >
              <Icon width={21} height={21} strokeWidth={active ? 2.1 : 1.75} />
              <span className="truncate max-w-full px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
