"use client";

import { useActionState, useState } from "react";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { applyFee, formatBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { salvarTaxasAction } from "./actions";

const METHODS = Object.keys(PAYMENT_METHODS) as PaymentMethod[];

function pctToInput(pct: number): string {
  return pct === 0 ? "0" : String(pct).replace(".", ",");
}

function parsePct(raw: string): number {
  const n = Number(raw.trim().replace("%", "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function TaxasForm({ fees }: { fees: Record<PaymentMethod, number> }) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    salvarTaxasAction,
    initialConfigFormState,
  );

  const [values, setValues] = useState<Record<PaymentMethod, string>>(() => {
    const initial = {} as Record<PaymentMethod, string>;
    for (const method of METHODS) initial[method] = pctToInput(fees[method] ?? 0);
    return initial;
  });

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card className="divide-y divide-line overflow-hidden">
        {METHODS.map((method) => {
          const pct = parsePct(values[method]);
          const { netCents } = applyFee(10000, pct);
          return (
            <div key={method} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="grow min-w-0">
                  <Label htmlFor={`fee-${method}`} className="mb-0 text-[15px] text-ink">
                    {PAYMENT_METHODS[method]}
                  </Label>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {pct > 0
                      ? `${formatBRL(10000)} viram ${formatBRL(netCents)}`
                      : "Sem desconto"}
                  </p>
                </div>
                <div className="relative shrink-0">
                  <Input
                    id={`fee-${method}`}
                    name={`fee-${method}`}
                    inputMode="decimal"
                    value={values[method]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [method]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-24 pr-8 text-right tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                    %
                  </span>
                </div>
              </div>
              <FieldError message={errors[`fee-${method}`]} />
            </div>
          );
        })}
      </Card>

      <p className="text-xs text-ink-faint leading-relaxed px-1">
        Informe a taxa que a maquininha desconta em cada forma de recebimento.
        Usamos isso para calcular o valor líquido de cada atendimento no
        financeiro. Deixe 0 nas formas sem taxa (como Pix e dinheiro).
      </p>

      <FormError error={state.error} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar taxas"}
      </Button>

      <SavedToast savedAt={state.savedAt} message="Taxas salvas!" />
    </form>
  );
}
