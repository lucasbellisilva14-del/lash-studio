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
          className="fixed inset-0 z-40 bg-[rgb(23_21_30/0.22)] fade-in lg:bg-transparent"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <div className="fixed z-40 bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 flex flex-col items-end gap-2.5 lg:hidden">
        {aberto
          ? OPCOES.map(({ href, label, icon: Icon }, i) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-full bg-surface pl-4 pr-1.5 py-1.5 text-[14px] font-semibold text-ink shadow-[var(--shadow-pop)] ring-1 ring-[rgb(23_21_30/0.05)] pop-in"
                style={{ animationDelay: `${(OPCOES.length - 1 - i) * 40}ms` }}
                onClick={() => setAberto(false)}
              >
                {label}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-ink">
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
            "h-14 w-14 rounded-full bg-accent text-accent-ink shadow-[var(--shadow-pop)] hover:bg-accent-hover",
            "flex items-center justify-center transition-[transform,background-color] duration-200 active:scale-95",
            aberto && "rotate-45",
          )}
        >
          <IconPlus width={24} height={24} />
        </button>
      </div>
    </>
  );
}
