"use client";

/** Configurações do resumo diário (horário) e do WhatsApp automático. */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FormError, SavedToast } from "@/components/config/feedback";
import { cn } from "@/lib/cn";
import {
  salvarHorarioResumoAction,
  salvarEnvioAutomaticoAction,
} from "@/app/(app)/config/notificacoes/actions";

export function ResumoConfig({
  dailySummaryTime,
  autoSendMessages,
  waAutomaticoDisponivel,
}: {
  dailySummaryTime: string;
  autoSendMessages: boolean;
  waAutomaticoDisponivel: boolean;
}) {
  const [hora, setHora] = useState(dailySummaryTime);
  const [autoWa, setAutoWa] = useState(autoSendMessages);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<number | undefined>();

  function salvarHorario() {
    setError(undefined);
    startTransition(async () => {
      const res = await salvarHorarioResumoAction(hora);
      if (res.ok) setSavedAt(Date.now());
      else setError(res.error);
    });
  }

  function alternarAutoWa() {
    const novo = !autoWa;
    setAutoWa(novo);
    setError(undefined);
    startTransition(async () => {
      const res = await salvarEnvioAutomaticoAction(novo);
      if (res.ok) setSavedAt(Date.now());
      else {
        setAutoWa(!novo);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <p className="font-medium text-[15px] text-ink">Horário do resumo diário</p>
          <p className="text-[13px] text-ink-soft mt-0.5 mb-3">
            O resumo chega no horário que funciona pra sua rotina.
          </p>
          <div className="flex items-end gap-2.5">
            <div className="grow">
              <Field label="Todo dia às" htmlFor="hora-resumo">
                <Input
                  id="hora-resumo"
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </Field>
            </div>
            <Button onClick={salvarHorario} disabled={pending} className="shrink-0">
              Salvar
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-[15px] text-ink">WhatsApp automático</p>
              <p className="text-[13px] text-ink-soft mt-0.5 leading-relaxed">
                {waAutomaticoDisponivel
                  ? "As mensagens da fila (confirmações, lembretes, resgates) saem sozinhas junto com o resumo do dia — sem abrir o app."
                  : "Disponível quando a integração de WhatsApp (API) estiver configurada no seu plano. Por enquanto, a fila continua em 1 toque."}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={autoWa}
              disabled={!waAutomaticoDisponivel || pending}
              onClick={alternarAutoWa}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                autoWa ? "bg-accent" : "bg-surface-sunken border border-line",
                !waAutomaticoDisponivel && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                  autoWa ? "left-[calc(100%-26px)]" : "left-0.5",
                )}
              />
            </button>
          </div>
        </CardBody>
      </Card>

      <FormError error={error} />
      <SavedToast savedAt={savedAt} />
    </div>
  );
}
