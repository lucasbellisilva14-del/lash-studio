"use client";

/**
 * Registro do recebimento do atendimento: valor, forma de pagamento
 * (com taxa da maquininha) e líquido calculado ao vivo.
 */
import { useActionState, useState } from "react";
import { applyFee, formatBRL, parseBRL } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconAlert, IconMoney } from "@/components/ui/icons";
import {
  registerPaymentAction,
  type PaymentState,
} from "@/app/(app)/atendimentos/[appointmentId]/actions";
import { Chip, ChipRow } from "./chips";

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatPct(pct: number): string {
  return pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

const initialState: PaymentState = {};

export function PaymentForm({
  appointmentId,
  defaultAmountCents,
  depositPaidCents,
  fees,
}: {
  appointmentId: string;
  defaultAmountCents: number;
  /** Sinal já recebido (null se não houve). */
  depositPaidCents: number | null;
  /** feePct por forma de pagamento. */
  fees: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(registerPaymentAction, initialState);

  const [amountStr, setAmountStr] = useState(centsToInput(defaultAmountCents));
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [installments, setInstallments] = useState(2);

  const amountCents = parseBRL(amountStr);
  const feePct = method ? (fees[method] ?? 0) : 0;
  const { feeCents, netCents } = applyFee(amountCents, feePct);
  const remainingCents = depositPaidCents
    ? Math.max(0, amountCents - depositPaidCents)
    : null;

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft text-accent-strong">
            <IconMoney width={16} height={16} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Pagamento</h2>
            <p className="text-xs text-ink-soft">Registre o recebimento deste atendimento</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="method" value={method ?? ""} />

          <Field label="Valor cobrado" htmlFor="amount">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
                R$
              </span>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-10"
              />
            </div>
          </Field>

          {depositPaidCents ? (
            <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-strong">
              Sinal recebido: <span className="font-semibold">{formatBRL(depositPaidCents)}</span>
              {" — "}restante a cobrar:{" "}
              <span className="font-semibold">{formatBRL(remainingCents ?? 0)}</span>
            </p>
          ) : null}

          <div>
            <p className="block text-[13px] font-medium text-ink-soft mb-1.5">
              Forma de pagamento
            </p>
            <ChipRow>
              {(Object.entries(PAYMENT_METHODS) as [PaymentMethod, string][]).map(
                ([key, label]) => (
                  <Chip key={key} selected={method === key} onClick={() => setMethod(key)}>
                    {label}
                  </Chip>
                ),
              )}
            </ChipRow>
          </div>

          {method === "CREDITO_PARCELADO" ? (
            <Field label="Parcelas" htmlFor="installments">
              <Select
                id="installments"
                name="installments"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatBRL(Math.round(amountCents / n))}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="rounded-xl bg-surface-sunken px-3.5 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Valor</span>
              <span>{formatBRL(amountCents)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Taxa {method ? `(${formatPct(feePct)}%)` : ""}</span>
              <span>{feeCents > 0 ? `− ${formatBRL(feeCents)}` : formatBRL(0)}</span>
            </div>
            <div className="border-t border-line pt-1.5 flex justify-between items-baseline">
              <span className="font-medium text-ink">Você recebe</span>
              <span className="font-display text-lg font-semibold text-accent-strong">
                {formatBRL(netCents)}
              </span>
            </div>
          </div>

          {state.error ? (
            <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              <IconAlert width={16} height={16} className="shrink-0" />
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending || !method || amountCents <= 0}
          >
            {pending ? "Registrando..." : "Registrar recebimento"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
