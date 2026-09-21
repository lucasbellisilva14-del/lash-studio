"use client";

/** Gerencia o feed .ics: gerar/copiar link, instruções e revogação. */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { IconCalendar, IconCheck } from "@/components/ui/icons";
import { FormError, SavedToast } from "@/components/config/feedback";
import { desligarCalendario, gerarLinkCalendario } from "./actions";

export function CalendarioManager({ feedUrl }: { feedUrl: string | null }) {
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

  return (
    <div className="space-y-4">
      {!feedUrl ? (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-xl bg-accent-soft text-accent-strong flex items-center justify-center shrink-0">
                <IconCalendar width={20} height={20} />
              </span>
              <div>
                <p className="font-medium text-[15px] text-ink">Seus atendimentos no seu calendário</p>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                  Gere um link secreto e assine no Google Calendar ou no iPhone: os
                  atendimentos aparecem lá sozinhos e se atualizam a cada hora.
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              disabled={pending}
              onClick={() => rodar(gerarLinkCalendario)}
            >
              {pending ? "Gerando..." : "Gerar link do calendário"}
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <p className="font-medium text-[15px] text-ink mb-2">Seu link secreto</p>
              <p className="text-[13px] text-ink-soft break-all rounded-xl bg-surface-sunken border border-line px-3 py-2.5">
                {feedUrl}
              </p>
              <Button className="w-full mt-3" variant="secondary" onClick={copiar}>
                {copiado ? (
                  <span className="inline-flex items-center gap-2">
                    <IconCheck width={16} height={16} className="text-success" /> Link copiado ✓
                  </span>
                ) : (
                  "Copiar link"
                )}
              </Button>
              <p className="text-xs text-ink-faint mt-3 leading-relaxed">
                Quem tem esse link vê sua agenda — trate como uma senha. Vazou?
                Gere um novo abaixo que o antigo para de funcionar.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="font-medium text-[15px] text-ink mb-2.5">Como assinar</p>
              <div className="space-y-3 text-sm text-ink-soft leading-relaxed">
                <p>
                  <b className="text-ink">Google Calendar (computador):</b> no menu à esquerda,
                  toque no <b>+</b> ao lado de “Outras agendas” → <b>Com URL</b> → cole o link.
                  No celular, a agenda aparece depois de assinar pelo computador.
                </p>
                <p>
                  <b className="text-ink">iPhone:</b> Ajustes → Apps → Calendário → Contas →
                  Adicionar conta → <b>Outra</b> → <b>Adicionar assinatura de calendário</b> →
                  cole o link.
                </p>
              </div>
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
              <Button
                variant="danger"
                className="flex-1"
                disabled={pending}
                onClick={() => rodar(desligarCalendario)}
              >
                {pending ? "Desligando..." : "Desligar mesmo?"}
              </Button>
            ) : (
              <Button
                variant="danger-soft"
                className="flex-1"
                onClick={() => setConfirmandoDesligar(true)}
              >
                Desligar feed
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
