"use client";

/** O link de indicação: mandar pelo WhatsApp, compartilhar ou copiar. */
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { IconCheck, IconCopy, IconWhatsApp } from "@/components/ui/icons";

export function IndicarLink({ link, codigo }: { link: string; codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const mensagem = `Oi! Tô usando o LashOS pra cuidar da agenda, das confirmações e do Pix do sinal das clientes. Dá pra testar 7 dias grátis pelo meu link: ${link}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // clipboard indisponível
    }
  }

  return (
    <Card>
      <CardBody>
        <p className="text-[15px] font-semibold text-ink">Seu link de indicação</p>
        <p className="mt-2 break-all rounded-[14px] border border-line bg-surface-sunken px-3 py-2.5 text-[13px] text-ink-soft">
          {link.replace(/^https?:\/\/(www\.)?/, "")}
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "lg", "w-full gap-2")}
          >
            <IconWhatsApp width={18} height={18} />
            Mandar pelo WhatsApp
          </a>
          <Button variant="secondary" size="lg" className="w-full gap-2" onClick={copiar}>
            {copiado ? (
              <>
                <IconCheck width={16} height={16} className="text-success" /> Link copiado
              </>
            ) : (
              <>
                <IconCopy width={16} height={16} /> Copiar link
              </>
            )}
          </Button>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
          Ou peça para ela digitar o código <b className="font-semibold text-ink">{codigo}</b> no campo
          “Código de indicação” ao criar a conta.
        </p>
      </CardBody>
    </Card>
  );
}
