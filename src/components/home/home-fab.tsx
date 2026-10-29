"use client";

/**
 * "+" flutuante do celular (montado no shell, em todas as telas): abre um
 * menu com as criações principais, "Copiar meu link" e a calculadora de
 * cobrança (num Sheet). Some nas telas que já têm botão flutuante próprio.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalculadoraCobranca } from "@/components/ferramentas/calculadora-cobranca";
import type { DadosCobranca } from "@/components/ferramentas/types";
import { atalhosCriar } from "@/components/shell/quick/atalhos";
import { useCopiarLink } from "@/components/shell/quick/use-copiar-link";
import { Sheet } from "@/components/ui/sheet";
import { IconCalculator, IconCheck, IconLink, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Telas com botão flutuante próprio no celular (Agendar, Nova cliente…): o "+" global sai do caminho. */
const ROTAS_COM_BOTAO_PROPRIO = ["/agenda", "/clientes", "/estoque", "/servicos", "/financeiro"];

type Item = {
  key: string;
  label: string;
  icon: typeof IconPlus;
  href?: string;
  onClick?: () => void;
};

const ITEM_CLASSES =
  "flex items-center gap-2.5 rounded-full bg-surface pl-4 pr-1.5 py-1.5 text-[14px] font-semibold text-ink shadow-[var(--shadow-pop)] ring-1 ring-[rgb(23_21_30/0.05)] pop-in";

export function HomeFab({
  showExpense = true,
  linkPath = null,
  cobranca = null,
}: {
  /** Despesa é da dona: a funcionária só agenda e cadastra cliente. */
  showExpense?: boolean;
  /** Caminho do link público (null = sem "Copiar meu link"). */
  linkPath?: string | null;
  /** Dados da calculadora de cobrança (só a dona). */
  cobranca?: DadosCobranca | null;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const { copiado, copiar } = useCopiarLink(linkPath);

  if (ROTAS_COM_BOTAO_PROPRIO.includes(pathname)) return null;

  const itens: Item[] = atalhosCriar(showExpense).map((a) => ({
    key: a.href,
    label: a.label,
    icon: a.icon,
    href: a.href,
  }));
  if (linkPath) {
    itens.push({
      key: "link",
      label: copiado ? "Link copiado" : "Copiar meu link",
      icon: copiado ? IconCheck : IconLink,
      onClick: () => {
        void copiar();
      },
    });
  }
  if (cobranca) {
    itens.push({
      key: "calculadora",
      label: "Calculadora",
      icon: IconCalculator,
      onClick: () => {
        setAberto(false);
        setCalcAberta(true);
      },
    });
  }

  return (
    <>
      {aberto ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-[rgb(23_21_30/0.22)] fade-in lg:hidden"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <div className="fixed z-40 bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 flex flex-col items-end gap-2.5 lg:hidden no-print">
        {aberto
          ? itens.map(({ key, href, label, icon: Icon, onClick }, i) => {
              const atraso = { animationDelay: `${(itens.length - 1 - i) * 40}ms` };
              const miolo = (
                <>
                  {label}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-ink">
                    <Icon width={16} height={16} className={key === "link" && copiado ? "text-success" : undefined} />
                  </span>
                </>
              );
              return href ? (
                <Link
                  key={key}
                  href={href}
                  className={ITEM_CLASSES}
                  style={atraso}
                  onClick={() => setAberto(false)}
                >
                  {miolo}
                </Link>
              ) : (
                <button key={key} type="button" className={ITEM_CLASSES} style={atraso} onClick={onClick}>
                  {miolo}
                </button>
              );
            })
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

      {cobranca ? (
        <Sheet
          open={calcAberta}
          onClose={() => setCalcAberta(false)}
          title="Calculadora de cobrança"
          description="Pix, débito e crédito na hora, com a mensagem pronta."
          tall
        >
          <CalculadoraCobranca dados={cobranca} />
        </Sheet>
      ) : null}
    </>
  );
}
