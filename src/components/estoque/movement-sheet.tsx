"use client";

/**
 * Sheet de movimentação rápida: "＋ Entrada" (soma; custo opcional) ou
 * "− Baixa" (subtrai com motivo; o estoque nunca fica negativo).
 */
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconAlert } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import {
  registerMovementAction,
  type EstoqueActionState,
} from "@/app/(app)/estoque/actions";
import { formatQty, type ProductItem } from "@/components/estoque/types";

export type MovementKind = "ENTRADA" | "BAIXA";

const initialState: EstoqueActionState = { ok: false, error: null };

export function MovementSheet({
  product,
  kind,
  onClose,
}: {
  product: ProductItem;
  kind: MovementKind;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    registerMovementAction,
    initialState,
  );
  const entrada = kind === "ENTRADA";

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Sheet
      open
      onClose={onClose}
      title={entrada ? "Entrada de estoque" : "Baixa de estoque"}
    >
      <form action={formAction} className="grid gap-4 pt-1">
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="type" value={kind} />

        <p className="rounded-xl bg-surface-sunken px-3.5 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">{product.name}</span>
          {product.specLabel ? ` (${product.specLabel})` : ""} — em estoque:{" "}
          <span className="font-medium text-ink">
            {formatQty(product.quantity)} {product.unit}
          </span>
        </p>

        {state.error ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
            <p>{state.error}</p>
          </div>
        ) : null}

        <Field label={`Quantidade (${product.unit})`} htmlFor="movement-quantity">
          <Input
            id="movement-quantity"
            name="quantity"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="any"
            placeholder="0"
            required
            autoFocus
          />
        </Field>

        {entrada ? (
          <Field
            label="Custo (opcional)"
            htmlFor="movement-cost"
            hint="Atualiza o custo do insumo. Ex.: 89 ou 89,90"
          >
            <Input
              id="movement-cost"
              name="cost"
              inputMode="decimal"
              placeholder="0,00"
            />
          </Field>
        ) : (
          <Field
            label="Motivo (opcional)"
            htmlFor="movement-reason"
            hint="O estoque nunca fica negativo — baixas maiores zeram a quantidade."
          >
            <Input
              id="movement-reason"
              name="reason"
              maxLength={120}
              placeholder="Ex.: perda, vencimento, uso em modelo"
            />
          </Field>
        )}

        <Button size="lg" disabled={pending}>
          {pending
            ? "Registrando..."
            : entrada
              ? "Registrar entrada"
              : "Registrar baixa"}
        </Button>
      </form>
    </Sheet>
  );
}
