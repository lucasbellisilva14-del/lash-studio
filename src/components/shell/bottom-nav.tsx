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
  { href: "/mensagens", label: "Fila", icon: IconChat },
  { href: "/financeiro", label: "Financeiro", icon: IconMoney },
  { href: "/mais", label: "Mais", icon: IconMore },
] as const;

/** Funcionária: os números dela ficam no Mais (com a senha e o suporte). */
const itemsEquipe = [
  { href: "/", label: "Hoje", icon: IconHome },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/mensagens", label: "Fila", icon: IconChat },
  { href: "/mais", label: "Mais", icon: IconMore },
] as const;

/** Barra inferior do celular: branca, com indicador escuro no item ativo. */
export function BottomNav({ isOwner = true }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const lista = isOwner ? items : itemsEquipe;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] inset-x-3 z-40 no-print"
    >
      <div
        className={cn(
          "mx-auto grid max-w-lg rounded-[24px] bg-surface p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-[rgb(23_21_30/0.06)]",
          isOwner ? "grid-cols-6" : "grid-cols-5",
        )}
      >
        {lista.map(({ href, label, icon: Icon }) => {
          // Na equipe, "Meus números" e "Sua senha" moram no Mais.
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href) ||
                (!isOwner && href === "/mais" && (pathname.startsWith("/financeiro") || pathname.startsWith("/config")));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  "flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-200",
                  active ? "bg-accent text-accent-ink" : "text-ink-faint",
                )}
              >
                <Icon width={20} height={20} strokeWidth={active ? 1.8 : 1.5} />
              </span>
              <span
                className={cn(
                  "max-w-full truncate px-0.5 text-[10.5px] font-semibold",
                  active ? "text-ink" : "text-ink-faint",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
