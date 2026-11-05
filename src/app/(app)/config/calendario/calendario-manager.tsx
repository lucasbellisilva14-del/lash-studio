"use client";

/**
 * Link do calendário (.ics): gerar, adicionar ao iPhone ou ao Google em um
 * toque, copiar, regenerar e desligar.
 */
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { IconCalendar, IconCheck, IconCopy, IconExternal } from "@/components/ui/icons";
import { FormError, SavedToast } from "@/components/config/feedback";
import { desligarCalendario, gerarLinkCalendario } from "./actions";

/** webcal:// faz o iPhone (e o Mac) abrir o Calendário pronto para assinar. */
function webcal(feedUrl: string): string {
  return feedUrl.replace(/^https?:\/\//, "webcal://");
}

/** O Google Agenda abre a tela "Adicionar agenda" já com o link preenchido. */
function googleAgenda(feedUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal(feedUrl))}`;
}

export function CalendarioManager({ feedUrl, isOwner }: { feedUrl: string | null; isOwner: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [copiado, setCopiado] = useState(false);
  const [confirmandoDesligar, setConfirmandoDesligar] = useState(false);

  function rodar(fn: () => Promise<{ ok: boolean; error?: string; savedAt?: number }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) setSavedAt(result.savedAt);
      else setError(result.error);
      setConfirmandoDesligar(false);
    });
  }

  async function copiar() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // clipboard indisponível
    }
  }

  const oQue = isOwner ? "Os atendimentos do estúdio" : "Os seus atendimentos";

  return (
    <div className="space-y-4">
      {!feedUrl ? (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
                <IconCalendar width={20} height={20} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">Sua agenda no seu calendário</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                  {oQue} aparecem sozinhos no Calendário do iPhone ou no Google Agenda, com o
                  nome da cliente e o serviço. É só de ida: o que você marca lá não muda o LashOS.
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full" disabled={pending} onClick={() => rodar(gerarLinkCalendario)}>
              {pending ? "Gerando..." : "Ativar agenda no calendário"}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <p className="text-[15px] font-semibold text-ink">Adicionar em um toque</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                Abra no aparelho onde você quer ver a agenda.
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <a href={webcal(feedUrl)} className={buttonClasses("primary", "lg", "w-full gap-2")}>
                  <IconCalendar width={18} height={18} />
                  Adicionar ao iPhone
                </a>
                <a
                  href={googleAgenda(feedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "lg", "w-full gap-2")}
                >
                  <IconExternal width={17} height={17} />
                  Adicionar ao Google Agenda
                </a>
              </div>
              <ul className="mt-4 space-y-2 text-[12.5px] leading-snug text-ink-soft">
                <li>
                  <b className="font-semibold text-ink">iPhone:</b> o Calendário abre pedindo para
                  assinar. Toque em Assinar e depois em OK. Atualiza sozinho a cada hora.
                </li>
                <li>
                  <b className="font-semibold text-ink">Google Agenda:</b> abre no navegador já com o
                  link; confirme em Adicionar. No celular, a agenda aparece no app depois disso. O
                  Google atualiza calendários assinados de poucas em poucas horas.
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="mb-2 text-[15px] font-semibold text-ink">Seu link secreto</p>
              <p className="break-all rounded-[14px] border border-line bg-surface-sunken px-3 py-2.5 text-[13px] text-ink-soft">
                {feedUrl}
              </p>
              <Button className="mt-3 w-full gap-2" variant="secondary" onClick={copiar}>
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
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                Para outro app de calendário: cole este link na opção de assinar por URL. Quem tem o
                link vê sua agenda, então trate como uma senha. Vazou? Gere um novo abaixo e o antigo
                para de funcionar.
              </p>
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={pending}
              onClick={() => rodar(gerarLinkCalendario)}
            >
              {pending ? "Gerando..." : "Gerar novo link"}
            </Button>
            {confirmandoDesligar ? (
              <Button variant="danger" className="flex-1" disabled={pending} onClick={() => rodar(desligarCalendario)}>
                {pending ? "Desligando..." : "Desligar mesmo?"}
              </Button>
            ) : (
              <Button variant="danger-soft" className="flex-1" onClick={() => setConfirmandoDesligar(true)}>
                Desligar
              </Button>
            )}
          </div>
        </>
      )}

      <FormError error={error} />
      <SavedToast savedAt={savedAt} message="Pronto!" />
    </div>
  );
}
