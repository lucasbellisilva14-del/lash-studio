"use client";

import { useActionState, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { AutoSaveStatus, useAutoSave } from "@/components/config/autosave";
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
  const formRef = useRef<HTMLFormElement>(null);
  const { agendar, aoEnviar } = useAutoSave(formRef, formAction);
  const [depositType, setDepositType] = useState<DepositType>(defaults.depositType);

  const errors = state.fieldErrors ?? {};

  const defaultPercent =
    defaults.depositType === "PERCENT" ? String(defaults.depositValue) : "30";
  const defaultFixed =
    defaults.depositType === "FIXED"
      ? (defaults.depositValue / 100).toFixed(2).replace(".", ",")
      : "";

  return (
    <form ref={formRef} onSubmit={aoEnviar} className="space-y-5">
      <div className="flex justify-end">
        <AutoSaveStatus pending={pending} state={state} />
      </div>

      {/* Sinal */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">
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
                onClick={() => {
                  setDepositType(option.value);
                  agendar();
                }}
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
            <Field label="Porcentagem do valor do serviço" htmlFor="depositPercent" hint="Ex.: 30% de um serviço de R$ 200 = sinal de R$ 60. Vai no Pix que a cliente recebe.">
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
            <Field label="Valor fixo do sinal" htmlFor="depositFixed" hint="O mesmo valor para qualquer serviço que exige sinal.">
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
            <p className="text-[13px] text-ink-soft bg-surface-sunken rounded-[14px] px-4 py-2.5">
              Nenhum sinal será cobrado — mesmo de clientes com faltas.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Cancelamento e faltas */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">
            Cancelamento e faltas
          </h2>

          <Field
            label="Cancelamento sem multa até"
            htmlFor="cancellationWindowHours"
            hint="Depois desse prazo, o cancelamento conta como tardio e fica no histórico da cliente."
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
            hint="Quem faltou essa quantidade de vezes passa a pagar sinal em qualquer serviço."
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
          <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">Manutenção</h2>

          <Field
            label="Prazo máximo para manutenção"
            htmlFor="maintenanceLimitDays"
            hint="Passou desse prazo, o app sugere trocar a manutenção por aplicação ao agendar."
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
            hint="Nesse dia do ciclo, a mensagem de manutenção aparece na sua Fila."
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
            <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">
              Status das clientes
            </h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Janelas usadas para classificar clientes automaticamente.
            </p>
          </div>

          <Field
            label="Janela de “em risco”"
            htmlFor="riskWindowDays"
            hint="Por quantos dias depois do prazo da manutenção a cliente aparece como em risco."
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
            hint="Sem nenhum atendimento por esse tempo, a cliente aparece como inativa."
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
          <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">Resumo diário</h2>
          <Field
            label="Horário do resumo do dia"
            htmlFor="dailySummaryTime"
            hint="Nessa hora chega no celular o resumo do seu dia (com as notificações ligadas)."
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

      <button type="submit" className="sr-only">
        Salvar
      </button>

      <SavedToast savedAt={state.savedAt} message="Políticas salvas" />
    </form>
  );
}
