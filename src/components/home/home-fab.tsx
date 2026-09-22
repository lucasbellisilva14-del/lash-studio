"use client";

/** FAB da home: "+" abre um menu com as 3 criações principais. */
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  IconCalendar,
  IconMoney,
  IconPlus,
  IconUsers,
} from "@/components/ui/icons";

const OPCOES = [
  { href: "/agenda?novo=1", label: "Agendar horário", icon: IconCalendar },
  { href: "/clientes?nova=1", label: "Nova cliente", icon: IconUsers },
  { href: "/financeiro?despesa=1", label: "Nova despesa", icon: IconMoney },
] as const;

export function HomeFab() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {aberto ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <div className="fixed z-40 bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 lg:bottom-8 lg:right-8 flex flex-col items-end gap-2.5">
        {aberto
          ? OPCOES.map(({ href, label, icon: Icon }, i) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-full bg-surface border border-line shadow-[var(--shadow-pop)] pl-4 pr-2 py-2 text-sm font-medium text-ink sheet-in"
                style={{ animationDelay: `${(OPCOES.length - 1 - i) * 40}ms` }}
                onClick={() => setAberto(false)}
              >
                {label}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Icon width={16} height={16} />
                </span>
              </Link>
            ))
          : null}

        <button
          aria-label={aberto ? "Fechar" : "Criar novo"}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className={cn(
            "h-14 w-14 rounded-full bg-accent-gradient text-accent-ink shadow-[var(--shadow-pop)]",
            "flex items-center justify-center transition-transform active:scale-95",
            aberto && "rotate-45",
          )}
        >
          <IconPlus width={24} height={24} />
        </button>
      </div>
    </>
  );
}
