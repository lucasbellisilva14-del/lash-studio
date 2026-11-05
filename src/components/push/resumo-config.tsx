"use client";

/** Horário do resumo diário. O WhatsApp automático mora em /config/whatsapp. */
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IconChevronRight, IconWhatsApp } from "@/components/ui/icons";
import { FormError, SavedToast } from "@/components/config/feedback";
import { salvarHorarioResumoAction } from "@/app/(app)/config/notificacoes/actions";

export function ResumoConfig({ dailySummaryTime }: { dailySummaryTime: string }) {
  const [hora, setHora] = useState(dailySummaryTime);
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

      <Link href="/config/whatsapp" className="block">
        <Card className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-muted sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
            <IconWhatsApp width={18} height={18} />
          </span>
          <span className="min-w-0 grow">
            <span className="block text-[15px] font-semibold text-ink">WhatsApp automático</span>
            <span className="block text-[13px] text-ink-soft">
              Conecte seu número e as confirmações saem sozinhas
            </span>
          </span>
          <IconChevronRight className="shrink-0 text-ink-faint" width={18} height={18} />
        </Card>
      </Link>

      <FormError error={error} />
      <SavedToast savedAt={savedAt} />
    </div>
  );
}
