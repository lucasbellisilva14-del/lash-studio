"use client";

/**
 * Respostas prontas de WhatsApp: cada pergunta frequente com a resposta já
 * preenchida com os dados do estúdio, para copiar ou abrir no WhatsApp.
 * Recebe as respostas montadas por `montarRespostas` (respostas.ts).
 */
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { IconCheck, IconCopy, IconWhatsApp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useCopiar } from "./copiar";
import type { Resposta } from "./respostas";

function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function RespostasProntas({
  respostas,
  className,
}: {
  respostas: Resposta[];
  className?: string;
}) {
  const [copia, copiar] = useCopiar();

  return (
    <div className={className}>
      <ul className="space-y-3">
        {respostas.map((resposta) => {
          const copiada = copia?.id === resposta.id && copia.ok;
          const falhou = copia?.id === resposta.id && !copia.ok;
          return (
            <li key={resposta.id}>
              <Card>
                <CardBody>
                  <h3 className="text-[15px] font-bold tracking-[-0.01em] text-ink">
                    {resposta.pergunta}
                  </h3>
                  <p className="mt-2 whitespace-pre-line rounded-[14px] bg-surface-sunken px-3.5 py-3 text-[14px] leading-relaxed text-ink">
                    {resposta.texto}
                  </p>
                  {resposta.pendencia ? (
                    <p className="mt-2 text-[12.5px] leading-snug text-warning">
                      {resposta.pendencia}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={copiada ? "success-soft" : "secondary"}
                      size="sm"
                      onClick={() => copiar(resposta.id, resposta.texto)}
                    >
                      {copiada ? (
                        <IconCheck width={16} height={16} />
                      ) : (
                        <IconCopy width={16} height={16} />
                      )}
                      {copiada ? "Copiado" : "Copiar"}
                    </Button>
                    <a
                      href={linkWhatsApp(resposta.texto)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonClasses("primary", "sm"))}
                    >
                      <IconWhatsApp width={16} height={16} />
                      Abrir no WhatsApp
                    </a>
                  </div>
                  <p role="status" className={falhou ? "mt-2 text-[12.5px] text-danger" : "sr-only"}>
                    {copiada
                      ? "Resposta copiada."
                      : falhou
                        ? "Não deu para copiar. Toque e segure no texto para copiar."
                        : ""}
                  </p>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
