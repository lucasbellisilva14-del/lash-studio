"use client";

/**
 * Divulgação: QR code do link de agendamento (baixar PNG ou imprimir em A5),
 * textos prontos para a bio do Instagram e as respostas prontas de WhatsApp.
 * O QR chega do servidor como SVG; o PNG sai da rota /ferramentas/qr.
 */
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  IconPrinter,
} from "@/components/ui/icons";
import { useCopiar } from "./copiar";
import { RespostasProntas } from "./respostas-prontas";
import type { DadosDivulgacao } from "./types";

const ID_IMPRESSAO = "qr-impressao";

/** Só a folha do QR sai na impressão; o resto da tela some. */
const CSS_IMPRESSAO = `
@media print {
  @page { size: A5 portrait; margin: 12mm; }
  body * { visibility: hidden !important; }
  #${ID_IMPRESSAO}, #${ID_IMPRESSAO} * { visibility: visible !important; }
  #${ID_IMPRESSAO} { position: fixed; inset: 0; display: flex !important; }
}
`;

function textosDaBio(dados: DadosDivulgacao): { id: string; titulo: string; texto: string }[] {
  const { link, studioName } = dados;
  return [
    {
      id: "bio-direta",
      titulo: "Direta",
      texto: `${studioName}\nExtensão de cílios com agendamento online\nAgende seu horário no link\n${link}`,
    },
    {
      id: "bio-acolhedora",
      titulo: "Acolhedora",
      texto: `Cílios com cara de você, feitos com cuidado\nHorários abertos: é só escolher o seu\n${link}`,
    },
    {
      id: "bio-curta",
      titulo: "Curta",
      texto: `Lash designer · agenda online\n${link}`,
    },
  ];
}

export function Divulgacao({ dados }: { dados: DadosDivulgacao }) {
  const [copia, copiar] = useCopiar();
  const bios = textosDaBio(dados);

  return (
    <div className="@container space-y-8">
      <style>{CSS_IMPRESSAO}</style>

      <div className="grid gap-4 @3xl:grid-cols-2 @3xl:items-start">
        <Card>
          <CardHeader
            title="QR code do seu link"
            description="Cole no balcão, no cartão ou nos stories: a cliente aponta a câmera e agenda."
          />
          <CardBody>
            <div
              className="mx-auto w-full max-w-72 rounded-[18px] border border-line bg-white p-4 [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={`QR code do link ${dados.link}`}
              dangerouslySetInnerHTML={{ __html: dados.qrSvg }}
            />
            <p className="mt-3 break-all text-center text-[13px] tabular-nums text-ink-soft">
              {dados.link}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href="/ferramentas/qr"
                download="qr-agendamento.png"
                className={buttonClasses("primary", "md")}
              >
                <IconDownload width={18} height={18} />
                Baixar PNG
              </a>
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                <IconPrinter width={18} height={18} />
                Imprimir
              </Button>
            </div>
            <p className="mt-2 text-center text-[12px] text-ink-faint">
              O PNG sai em 1024 px; a impressão, numa folha A5 limpa.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Texto para a bio"
            description="Três jeitos de apresentar o link no Instagram. Copie o que combina com você."
          />
          <CardBody>
            <ul className="space-y-3">
              {bios.map((bio) => {
                const copiada = copia?.id === bio.id && copia.ok;
                return (
                  <li key={bio.id} className="rounded-[14px] border border-line p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                        {bio.titulo}
                      </p>
                      <Button
                        type="button"
                        variant={copiada ? "success-soft" : "ghost"}
                        size="sm"
                        onClick={() => copiar(bio.id, bio.texto)}
                      >
                        {copiada ? (
                          <IconCheck width={16} height={16} />
                        ) : (
                          <IconCopy width={16} height={16} />
                        )}
                        {copiada ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">
                      {bio.texto}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p role="status" className={copia && !copia.ok ? "mt-2 text-[12.5px] text-danger" : "sr-only"}>
              {copia?.id.startsWith("bio-")
                ? copia.ok
                  ? "Texto copiado."
                  : "Não deu para copiar. Toque e segure no texto para copiar."
                : ""}
            </p>
            {dados.instagram ? (
              <a
                href={`https://instagram.com/${dados.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "md", "mt-4 w-full")}
              >
                Abrir meu Instagram
                <IconExternal width={16} height={16} />
              </a>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="respostas-titulo">
        <h2 id="respostas-titulo" className="text-[17px] font-bold tracking-[-0.015em] text-ink">
          Respostas prontas de WhatsApp
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          As perguntas que toda cliente faz, respondidas com seus preços, prazos e endereço.
        </p>
        <RespostasProntas respostas={dados.respostas} className="mt-3" />
      </section>

      {/* Folha A5 para impressão: só aparece no papel. */}
      <div
        id={ID_IMPRESSAO}
        aria-hidden
        className="hidden flex-col items-center justify-center gap-6 bg-white p-8 text-center text-ink"
      >
        {dados.logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo do estúdio só na impressão
          <img src={dados.logoSrc} alt="" className="h-20 w-20 rounded-[12px] object-cover" />
        ) : null}
        <p className="text-[28px] font-bold tracking-[-0.03em]">{dados.studioName}</p>
        <div
          className="w-full max-w-[90mm] [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: dados.qrSvg }}
        />
        <p className="text-[22px] font-semibold tracking-[-0.02em]">Agende pelo QR code</p>
        <p className="break-all text-[13px] text-ink-soft">{dados.link}</p>
      </div>
    </div>
  );
}
