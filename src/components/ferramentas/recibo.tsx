"use client";

/**
 * Recibo de atendimento: escolhe um atendimento concluído recente e mostra a
 * imagem 1080×1350 (feed) com as cores do estúdio, gerada pela rota
 * /ferramentas/recibo/[appointmentId]. Baixa ou manda no WhatsApp da cliente.
 */
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { IconDownload, IconInvoice, IconWhatsApp } from "@/components/ui/icons";
import { waLink } from "@/lib/phone";
import type { DadosRecibo } from "./types";

function urlDoRecibo(id: string): string {
  return `/ferramentas/recibo/${encodeURIComponent(id)}`;
}

export function Recibo({ dados }: { dados: DadosRecibo }) {
  const [escolhido, setEscolhido] = useState(dados.atendimentos[0]?.id ?? "");
  const [carregando, setCarregando] = useState(true);
  const atendimento = dados.atendimentos.find((a) => a.id === escolhido) ?? null;

  if (dados.atendimentos.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconInvoice />}
          title="Nenhum atendimento concluído nos últimos 30 dias"
          description="Quando você concluir um atendimento na agenda, ele aparece aqui para virar recibo."
          action={
            <Link href="/agenda" className={buttonClasses("primary", "md")}>
              Abrir agenda
            </Link>
          }
        />
      </Card>
    );
  }

  const primeiroNome = atendimento?.clienteNome.split(" ")[0] ?? "";
  const textoWhatsApp = `Oi, ${primeiroNome}! Aqui está o recibo do seu atendimento no ${dados.studioName}. Obrigada pela confiança!`;

  function trocar(id: string) {
    setEscolhido(id);
    setCarregando(true);
  }

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] @3xl:items-start">
        <Card>
          <CardHeader
            title="Qual atendimento?"
            description="Só os concluídos dos últimos 30 dias."
          />
          <CardBody className="space-y-4">
            <Field label="Atendimento" htmlFor="recibo-atendimento" hint="Data · cliente · serviço.">
              <Select
                id="recibo-atendimento"
                value={escolhido}
                onChange={(e) => trocar(e.target.value)}
              >
                {dados.atendimentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.rotulo}
                  </option>
                ))}
              </Select>
            </Field>

            {atendimento ? (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={urlDoRecibo(atendimento.id)}
                  download={`recibo-${primeiroNome.toLowerCase() || "atendimento"}.png`}
                  className={buttonClasses("secondary", "md")}
                >
                  <IconDownload width={18} height={18} />
                  Baixar
                </a>
                <a
                  href={waLink(atendimento.clientePhone, textoWhatsApp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("primary", "md")}
                >
                  <IconWhatsApp width={18} height={18} />
                  Enviar no WhatsApp
                </a>
              </div>
            ) : null}
            <p className="text-[12.5px] leading-snug text-ink-soft">
              O WhatsApp abre a conversa com {primeiroNome || "a cliente"} e a mensagem pronta;
              a imagem você baixa e anexa na conversa.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody aria-live="polite">
            <p className="text-[13px] font-semibold text-ink">Prévia</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              1080 × 1350, no tamanho do feed, com as cores do seu link.
            </p>
            {atendimento ? (
              <div className="relative mx-auto mt-3 w-full max-w-sm overflow-hidden rounded-[18px] border border-line bg-surface-sunken">
                <div className="aspect-[4/5] w-full">
                  {carregando ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-soft">
                      Gerando o recibo…
                    </div>
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada pela rota do app */}
                  <img
                    key={atendimento.id}
                    src={urlDoRecibo(atendimento.id)}
                    alt={`Recibo de ${atendimento.clienteNome}`}
                    width={1080}
                    height={1350}
                    onLoad={() => setCarregando(false)}
                    onError={() => setCarregando(false)}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
