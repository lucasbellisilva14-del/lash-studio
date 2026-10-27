"use client";

/**
 * Meta do mês: barra de progresso quando definida, convite quando não.
 * O Sheet "Meta do mês" faz upsert via server action (saveGoal) e também
 * abre pelo botão do cabeçalho.
 */
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { formatBRL, parseBRL } from "@/lib/money";
import { saveGoal, type FinanceiroActionState } from "@/app/(app)/financeiro/actions";
import { centsToInput, ErrorBox } from "./expense-sheet";
import { IconTarget } from "./icons";

const initialState: FinanceiroActionState = { ok: false, error: null };

export function GoalSheet({
  monthKey,
  monthLabel,
  targetCents,
  onClose,
}: {
  monthKey: string;
  monthLabel: string;
  targetCents: number | null;
  onClose: () => void;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(saveGoal, initialState);
  const [target, setTarget] = useState(targetCents ? centsToInput(targetCents) : "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const previewCents = parseBRL(target);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Meta do mês"
      description={`Quanto você quer receber, já sem as taxas, em ${monthLabel.toLowerCase()}.`}
      footer={
        <Button type="submit" form={formId} size="lg" disabled={pending}>
          {pending ? "Salvando..." : "Salvar meta"}
        </Button>
      }
    >
      <form id={formId} action={formAction} className="grid gap-4">
        <input type="hidden" name="month" value={monthKey} />

        {state.error ? <ErrorBox message={state.error} /> : null}

        <Field
          label="Meta de recebimento"
          htmlFor={`${formId}-target`}
          hint={
            previewCents > 0
              ? `Prévia: ${formatBRL(previewCents)}`
              : "Ex.: 5.000. A barra do mês compara com o que já entrou."
          }
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
              R$
            </span>
            <Input
              id={`${formId}-target`}
              name="target"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </Field>
      </form>
    </Sheet>
  );
}

export function GoalCard({
  monthKey,
  monthLabel,
  targetCents,
  netCents,
}: {
  monthKey: string;
  monthLabel: string;
  targetCents: number | null;
  /** O que já entrou no mês (líquido). */
  netCents: number;
}) {
  const [open, setOpen] = useState(false);

  const hasGoal = targetCents != null && targetCents > 0;
  const pct = hasGoal ? Math.max(0, Math.round((netCents / targetCents) * 100)) : 0;
  const faltamCents = hasGoal ? Math.max(0, targetCents - netCents) : 0;
  const alcancada = hasGoal && faltamCents === 0;

  return (
    <>
      <Card>
        <CardBody>
          {hasGoal ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                    <IconTarget width={16} height={16} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-ink">Meta do mês</h2>
                    <p className="truncate text-[12.5px] tabular-nums text-ink-soft">
                      {formatBRL(netCents)} de {formatBRL(targetCents)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                  Editar
                </Button>
              </div>

              <div
                className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-valuenow={Math.min(pct, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da meta do mês"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    alcancada ? "bg-success" : "bg-accent",
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    "text-[13px]",
                    alcancada ? "font-medium text-success" : "text-ink-soft",
                  )}
                >
                  {alcancada ? "Meta alcançada. Arrasou!" : `Faltam ${formatBRL(faltamCents)}`}
                </p>
                <p className="text-[13px] font-semibold tabular-nums text-accent-strong">{pct}%</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <IconTarget width={20} height={20} />
              </span>
              <div className="min-w-0 grow">
                <h2 className="text-[15px] font-semibold text-ink">Defina a meta do mês</h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
                  Acompanhe quanto falta para bater seu objetivo de recebimento.
                </p>
              </div>
              <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
                Definir
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {open ? (
        <GoalSheet
          monthKey={monthKey}
          monthLabel={monthLabel}
          targetCents={targetCents}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
