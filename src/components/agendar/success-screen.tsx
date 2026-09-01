"use client";

/** Tela de sucesso da solicitação pública — resumo + instruções do sinal (Pix). */
import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconCheck, IconWhatsApp } from "@/components/ui/icons";
import { IconCopy } from "./icons";
import { formatBRL } from "@/lib/money";
import { waLink } from "@/lib/phone";
import type { SolicitacaoSucesso } from "./types";

const LINK_BOTAO_SECUNDARIO =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line " +
  "bg-surface px-5 text-base font-medium text-ink transition-colors hover:bg-background";

export function SuccessScreen({
  sucesso,
  whatsapp,
}: {
  sucesso: SolicitacaoSucesso;
  /** WhatsApp do estúdio (dígitos) para contato geral */
  whatsapp: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function copiarPix(codigo: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(codigo);
      ok = true;
    } catch {
      // Fallback para navegadores sem clipboard API (ou fora de HTTPS).
      try {
        const area = document.createElement("textarea");
        area.value = codigo;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopiado(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiado(false), 2500);
    }
  }

  const { sinal } = sucesso;

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <IconCheck width={30} height={30} className="text-success" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
          Solicitação enviada!
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
          Sua solicitação foi enviada — o estúdio confirma em breve pelo WhatsApp.
        </p>
      </div>

      <Card className="mt-6">
        <CardBody className="space-y-2.5">
          <LinhaResumo rotulo="Serviço" valor={sucesso.servico} />
          <LinhaResumo rotulo="Data" valor={sucesso.data} />
          <LinhaResumo rotulo="Hora" valor={sucesso.hora} />
          <LinhaResumo rotulo="Valor" valor={formatBRL(sucesso.valorCents)} />
        </CardBody>
      </Card>

      {sinal ? (
        <Card className="mt-4">
          <CardBody className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
                Sinal para garantir o horário
              </p>
              <p className="mt-0.5 font-display text-2xl font-semibold text-ink">
                {formatBRL(sinal.valorCents)}
              </p>
            </div>

            {sinal.pixCodigo ? (
              <>
                <p className="text-sm text-ink-soft">
                  Pague com o Pix copia e cola abaixo — o valor já vai preenchido no
                  app do seu banco.
                </p>
                <div className="max-h-28 overflow-y-auto break-all rounded-xl bg-surface-sunken px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink-soft">
                  {sinal.pixCodigo}
                </div>
                <Button size="lg" onClick={() => copiarPix(sinal.pixCodigo!)}>
                  {copiado ? (
                    <>
                      <IconCheck width={18} height={18} />
                      Código copiado!
                    </>
                  ) : (
                    <>
                      <IconCopy width={18} height={18} />
                      Copiar código Pix
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                O estúdio vai te passar os dados do pagamento pelo WhatsApp.
              </p>
            )}

            {sinal.waComprovanteUrl ? (
              <>
                <p className="text-xs text-ink-faint">
                  Depois de pagar, envie o comprovante no WhatsApp do estúdio para
                  confirmar seu horário.
                </p>
                <a
                  href={sinal.waComprovanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_BOTAO_SECUNDARIO}
                >
                  <IconWhatsApp width={19} height={19} />
                  Enviar comprovante no WhatsApp
                </a>
              </>
            ) : (
              <p className="text-xs text-ink-faint">
                Depois de pagar, envie o comprovante para o estúdio confirmar seu
                horário.
              </p>
            )}
          </CardBody>
        </Card>
      ) : whatsapp ? (
        <a
          href={waLink(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${LINK_BOTAO_SECUNDARIO} mt-4`}
        >
          <IconWhatsApp width={19} height={19} />
          Falar com o estúdio no WhatsApp
        </a>
      ) : null}
    </div>
  );
}

function LinhaResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-ink-soft">{rotulo}</span>
      <span className="text-right text-[15px] font-medium text-ink">{valor}</span>
    </div>
  );
}
