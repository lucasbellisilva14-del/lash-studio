"use client";

/**
 * Painel de atalhos do PC (lg+): uma aba presa na borda direita da tela abre
 * um painel que desliza da direita com as criações principais, o link
 * público, a calculadora de cobrança e as respostas prontas. Abre sempre
 * fechado. A funcionária vê só Criar (sem despesa), Meu link e suporte.
 * z-index: aba z-30 (acima do conteúdo), painel z-45 (abaixo dos sheets z-50).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalculadoraCobranca } from "@/components/ferramentas/calculadora-cobranca";
import { RespostasProntas } from "@/components/ferramentas/respostas-prontas";
import type { Resposta } from "@/components/ferramentas/respostas";
import type { DadosCobranca } from "@/components/ferramentas/types";
import { SupportButton } from "@/components/shell/support";
import { buttonClasses } from "@/components/ui/button";
import {
  IconCalculator,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconExternal,
  IconFlash,
  IconQrCode,
  IconWhatsApp,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { atalhosCriar } from "./atalhos";
import { useCopiarLink } from "./use-copiar-link";

export function QuickPanel({
  isOwner,
  linkPath,
  cobranca,
  respostas = null,
}: {
  isOwner: boolean;
  /** Caminho do link público (null = a funcionária não atende pelo link). */
  linkPath: string | null;
  /** Dados da calculadora (só a dona). */
  cobranca: DadosCobranca | null;
  /** Respostas prontas de WhatsApp (só a dona). */
  respostas?: Resposta[] | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const [respostasAbertas, setRespostasAbertas] = useState(false);
  const abaRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const painelId = useId();
  const { urlCurta, copiado, copiar } = useCopiarLink(linkPath);

  const atalhos = atalhosCriar(isOwner);

  function fechar() {
    setAberto(false);
    abaRef.current?.focus();
  }

  // Aberto: o foco vai para o painel; Esc fecha (a menos que um sheet esteja por cima).
  useEffect(() => {
    if (!aberto) return;
    painelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setAberto(false);
      abaRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberto]);

  return (
    <>
      {/* Aba presa na borda direita, no meio da altura */}
      <button
        ref={abaRef}
        type="button"
        aria-label="Atalhos"
        aria-expanded={aberto}
        aria-controls={aberto ? painelId : undefined}
        onClick={() => setAberto(true)}
        className={cn(
          "group fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 lg:flex no-print",
          "h-12 items-center gap-0 rounded-l-[16px] bg-accent pl-3 pr-2.5 text-accent-ink",
          "shadow-[var(--shadow-pop)] hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          "transition-[background-color,opacity,transform] duration-200",
          aberto && "pointer-events-none opacity-0",
        )}
      >
        <IconFlash width={20} height={20} />
        <span
          aria-hidden
          className="max-w-0 overflow-hidden whitespace-nowrap text-[13.5px] font-semibold opacity-0 transition-[max-width,opacity,padding] duration-200 group-hover:max-w-[80px] group-hover:pl-2 group-hover:opacity-100 group-focus-visible:max-w-[80px] group-focus-visible:pl-2 group-focus-visible:opacity-100"
        >
          Atalhos
        </span>
      </button>

      {aberto ? (
        <div className="fixed inset-0 z-[45] hidden lg:block no-print">
          <button
            type="button"
            aria-label="Fechar atalhos"
            tabIndex={-1}
            className="absolute inset-0 bg-[rgb(23_21_30/0.18)] fade-in"
            onClick={fechar}
          />
          <div
            ref={painelRef}
            id={painelId}
            role="dialog"
            aria-label="Atalhos"
            tabIndex={-1}
            className="panel-in absolute inset-y-3 right-3 flex w-[380px] max-w-[calc(100vw-24px)] flex-col rounded-[24px] bg-surface shadow-[var(--shadow-modal)] ring-1 ring-[rgb(23_21_30/0.05)] outline-none"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
                  <IconFlash width={16} height={16} />
                </span>
                <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">Atalhos</h2>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <IconX width={18} height={18} />
              </button>
            </div>

            <div className="grow space-y-7 overflow-y-auto px-5 pt-2 pb-6">
              <Secao titulo="Criar">
                <div className="grid grid-cols-2 gap-2.5">
                  {atalhos.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={fechar}
                      className="flex flex-col gap-3 rounded-[18px] bg-surface-sunken p-3.5 ring-1 ring-transparent transition-[background-color,box-shadow] hover:bg-surface-muted hover:ring-line"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)]">
                        <Icon width={18} height={18} />
                      </span>
                      <span className="text-[14px] font-semibold leading-tight text-ink">{label}</span>
                    </Link>
                  ))}
                </div>
              </Secao>

              {linkPath ? (
                <Secao titulo="Meu link">
                  <div className="rounded-[18px] bg-surface-sunken p-3.5">
                    <p className="truncate text-[13.5px] font-medium text-ink" title={urlCurta ?? linkPath}>
                      {urlCurta ?? linkPath}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={copiar} className={buttonClasses("primary", "sm")}>
                        {copiado ? (
                          <IconCheck width={16} height={16} />
                        ) : (
                          <IconCopy width={16} height={16} />
                        )}
                        {copiado ? "Copiado" : "Copiar"}
                      </button>
                      <a
                        href={linkPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses("secondary", "sm")}
                      >
                        <IconExternal width={16} height={16} />
                        Abrir
                      </a>
                    </div>
                  </div>
                  {isOwner ? (
                    <LinhaLink href="/ferramentas?aba=divulgacao" onClick={fechar} icon={IconQrCode}>
                      QR code e divulgação
                    </LinhaLink>
                  ) : null}
                </Secao>
              ) : null}

              {isOwner && cobranca ? (
                <Secao titulo="Calculadora de cobrança">
                  <button
                    type="button"
                    aria-expanded={calcAberta}
                    onClick={() => setCalcAberta((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-[18px] bg-surface-sunken px-3.5 py-3 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)]">
                      <IconCalculator width={18} height={18} />
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block text-[14px] font-semibold text-ink">
                        {calcAberta ? "Fechar calculadora" : "Abrir calculadora"}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-soft">
                        Pix, débito e crédito na hora
                      </span>
                    </span>
                    <IconChevronDown
                      width={18}
                      height={18}
                      className={cn(
                        "shrink-0 text-ink-faint transition-transform duration-200",
                        calcAberta && "rotate-180",
                      )}
                    />
                  </button>
                  {calcAberta ? (
                    <div className="pop-in mt-3">
                      <CalculadoraCobranca dados={cobranca} />
                    </div>
                  ) : null}
                </Secao>
              ) : null}

              {isOwner && respostas && respostas.length > 0 ? (
                <Secao titulo="Respostas prontas">
                  <button
                    type="button"
                    aria-expanded={respostasAbertas}
                    onClick={() => setRespostasAbertas((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-[18px] bg-surface-sunken px-3.5 py-3 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-[var(--shadow-card)]">
                      <IconWhatsApp width={18} height={18} />
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block text-[14px] font-semibold text-ink">
                        {respostasAbertas ? "Fechar respostas" : "Respostas de WhatsApp"}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-soft">
                        Preço, sinal, remarcação e mais, com seus dados
                      </span>
                    </span>
                    <IconChevronDown
                      width={18}
                      height={18}
                      className={cn(
                        "shrink-0 text-ink-faint transition-transform duration-200",
                        respostasAbertas && "rotate-180",
                      )}
                    />
                  </button>
                  {respostasAbertas ? (
                    <div className="pop-in mt-3">
                      <RespostasProntas respostas={respostas} />
                    </div>
                  ) : null}
                </Secao>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-line px-3 py-2.5">
              <SupportButton variant="nav" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function LinhaLink({
  href,
  onClick,
  icon: Icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: typeof IconQrCode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mt-2 flex h-11 items-center gap-3 rounded-full px-3 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      <Icon width={18} height={18} />
      <span className="grow">{children}</span>
      <IconChevronRight width={16} height={16} className="text-ink-faint" />
    </Link>
  );
}
