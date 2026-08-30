"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { salvarPoliticasAction } from "./actions";

type DepositType = "PERCENT" | "FIXED" | "NONE";

const DEPOSIT_OPTIONS: { value: DepositType; label: string }[] = [
  { value: "PERCENT", label: "% do serviço" },
  { value: "FIXED", label: "Valor fixo" },
  { value: "NONE", label: "Não cobro" },
];

export type PoliticasDefaults = {
  depositType: DepositType;
  depositValue: number; // % ou centavos, conforme o tipo
  cancellationWindowHours: number;
  maintenanceLimitDays: number;
  maintenanceNoticeDay: number;
  noShowThreshold: number;
  riskWindowDays: number;
  inactiveDays: number;
  dailySummaryTime: string;
};

function SuffixInput({
  suffix,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={cn("pr-14", className)} {...props} />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
        {suffix}
      </span>
    </div>
  );
}

export function PoliticasForm({ defaults }: { defaults: PoliticasDefaults }) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    salvarPoliticasAction,
    initialConfigFormState,
  );
  const [depositType, setDepositType] = useState<DepositType>(defaults.depositType);

  const errors = state.fieldErrors ?? {};

  const defaultPercent =
    defaults.depositType === "PERCENT" ? String(defaults.depositValue) : "30";
  const defaultFixed =
    defaults.depositType === "FIXED"
      ? (defaults.depositValue / 100).toFixed(2).replace(".", ",")
      : "";

  return (
    <form action={formAction} className="space-y-4">
      {/* Sinal */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Sinal (pré-pagamento)
            </h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Cobrado ao agendar serviços que exigem sinal.
            </p>
          </div>

          <input type="hidden" name="depositType" value={depositType} />
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-sunken p-1">
            {DEPOSIT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDepositType(option.value)}
                aria-pressed={depositType === option.value}
                className={cn(
                  "h-9 rounded-lg text-[13px] font-medium transition-colors",
                  depositType === option.value
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-soft",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <FieldError message={errors.depositType} />

          {depositType === "PERCENT" ? (
            <Field label="Porcentagem do valor do serviço" htmlFor="depositPercent">
              <SuffixInput
                id="depositPercent"
                name="depositPercent"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                defaultValue={defaultPercent}
                suffix="%"
                required
              />
              <FieldError message={errors.depositPercent} />
            </Field>
          ) : null}

          {depositType === "FIXED" ? (
            <Field label="Valor fixo do sinal" htmlFor="depositFixed">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
                  R$
                </span>
                <Input
                  id="depositFixed"
                  name="depositFixed"
                  inputMode="decimal"
                  defaultValue={defaultFixed}
                  placeholder="50,00"
                  className="pl-10"
                  required
                />
              </div>
              <FieldError message={errors.depositFixed} />
            </Field>
          ) : null}

          {depositType === "NONE" ? (
            <p className="text-[13px] text-ink-soft bg-surface-sunken rounded-xl px-3.5 py-2.5">
              Nenhum sinal será cobrado — mesmo de clientes com faltas.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Cancelamento e faltas */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Cancelamento e faltas
          </h2>

          <Field
            label="Cancelamento sem multa até"
            htmlFor="cancellationWindowHours"
            hint="Cancelamentos depois desse prazo contam como cancelamento tardio."
          >
            <SuffixInput
              id="cancellationWindowHours"
              name="cancellationWindowHours"
              type="number"
              inputMode="numeric"
              min={0}
              max={168}
              defaultValue={defaults.cancellationWindowHours}
              suffix="h antes"
              required
            />
            <FieldError message={errors.cancellationWindowHours} />
          </Field>

          <Field
            label="Exigir sinal a partir de"
            htmlFor="noShowThreshold"
            hint="Clientes com esse número de faltas passam a pagar sinal sempre."
          >
            <SuffixInput
              id="noShowThreshold"
              name="noShowThreshold"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              defaultValue={defaults.noShowThreshold}
              suffix="faltas"
              required
            />
            <FieldError message={errors.noShowThreshold} />
          </Field>
        </CardBody>
      </Card>

      {/* Manutenção */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Manutenção</h2>

          <Field
            label="Prazo máximo para manutenção"
            htmlFor="maintenanceLimitDays"
            hint="Depois desse prazo, o atendimento vira aplicação nova."
          >
            <SuffixInput
              id="maintenanceLimitDays"
              name="maintenanceLimitDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              defaultValue={defaults.maintenanceLimitDays}
              suffix="dias"
              required
            />
            <FieldError message={errors.maintenanceLimitDays} />
          </Field>

          <Field
            label="Avisar a cliente no dia"
            htmlFor="maintenanceNoticeDay"
            hint="Dia do ciclo em que a mensagem de manutenção é sugerida."
          >
            <SuffixInput
              id="maintenanceNoticeDay"
              name="maintenanceNoticeDay"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              defaultValue={defaults.maintenanceNoticeDay}
              suffix="do ciclo"
              required
            />
            <FieldError message={errors.maintenanceNoticeDay} />
          </Field>
        </CardBody>
      </Card>

      {/* Status automático */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Status das clientes
            </h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Janelas usadas para classificar clientes automaticamente.
            </p>
          </div>

          <Field
            label="Janela de “em risco”"
            htmlFor="riskWindowDays"
            hint="Cliente que passou do prazo de manutenção há menos de N dias."
          >
            <SuffixInput
              id="riskWindowDays"
              name="riskWindowDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              defaultValue={defaults.riskWindowDays}
              suffix="dias"
              required
            />
            <FieldError message={errors.riskWindowDays} />
          </Field>

          <Field
            label="Considerar inativa após"
            htmlFor="inactiveDays"
            hint="Mais de N dias sem nenhum atendimento."
          >
            <SuffixInput
              id="inactiveDays"
              name="inactiveDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={730}
              defaultValue={defaults.inactiveDays}
              suffix="dias"
              required
            />
            <FieldError message={errors.inactiveDays} />
          </Field>
        </CardBody>
      </Card>

      {/* Resumo diário */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Resumo diário</h2>
          <Field
            label="Horário do resumo do dia"
            htmlFor="dailySummaryTime"
            hint="Hora em que o resumo da agenda fica pronto para você."
          >
            <Input
              id="dailySummaryTime"
              name="dailySummaryTime"
              type="time"
              defaultValue={defaults.dailySummaryTime}
              className="w-32 text-center tabular-nums"
              required
            />
            <FieldError message={errors.dailySummaryTime} />
          </Field>
        </CardBody>
      </Card>

      <FormError error={state.error} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar políticas"}
      </Button>

      <SavedToast savedAt={state.savedAt} message="Políticas salvas!" />
    </form>
  );
}
