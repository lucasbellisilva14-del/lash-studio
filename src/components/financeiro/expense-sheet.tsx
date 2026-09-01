"use client";

/**
 * Sheet de criação/edição de despesa — o mesmo formulário atende os dois casos
 * (com `expense` preenchido = edição, com hidden input `id`).
 * Exclusão em duas etapas (confirmação inline), em formulário separado.
 */
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { IconAlert } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatBRL, parseBRL } from "@/lib/money";
import {
  deleteExpense,
  saveExpense,
  type FinanceiroActionState,
} from "@/app/(app)/financeiro/actions";
import type { ExpenseCategory, ExpenseDraft, Recurrence } from "./types";

const initialState: FinanceiroActionState = { ok: false, error: null };

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
      <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export function ExpenseSheet({
  expense,
  defaultDateKey,
  onClose,
}: {
  /** null = nova despesa; preenchido = edição. */
  expense: ExpenseDraft | null;
  /** "yyyy-MM-dd" de hoje (data padrão da nova despesa). */
  defaultDateKey: string;
  onClose: () => void;
}) {
  const editing = expense !== null;
  const [state, formAction, pending] = useActionState(saveExpense, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteExpense, initialState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : "");
  const [recurrence, setRecurrence] = useState<Recurrence>(
    expense?.recurrence ?? "AVULSA",
  );

  useEffect(() => {
    if (state.ok || deleteState.ok) onClose();
  }, [state.ok, deleteState.ok, onClose]);

  const amountCents = parseBRL(amount);
  const busy = pending || deleting;

  return (
    <Sheet open onClose={onClose} title={editing ? "Editar despesa" : "Nova despesa"} tall>
      <form action={formAction} className="grid gap-4 pt-1">
        {expense ? <input type="hidden" name="id" value={expense.id} /> : null}

        {state.error ? <ErrorBox message={state.error} /> : null}

        <Field label="Descrição" htmlFor="expense-description">
          <Input
            id="expense-description"
            name="description"
            defaultValue={expense?.description ?? ""}
            placeholder="Ex.: Cola nova, aluguel do estúdio"
            maxLength={80}
            required
          />
        </Field>

        <Field label="Categoria" htmlFor="expense-category">
          <Select
            id="expense-category"
            name="category"
            defaultValue={expense?.category ?? "MATERIAL"}
          >
            {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((key) => (
              <option key={key} value={key}>
                {EXPENSE_CATEGORIES[key]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Valor"
          htmlFor="expense-amount"
          hint={amountCents > 0 ? `Prévia: ${formatBRL(amountCents)}` : "Ex.: 89,90"}
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
              R$
            </span>
            <Input
              id="expense-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </Field>

        <Field label="Data" htmlFor="expense-date">
          <Input
            id="expense-date"
            name="date"
            type="date"
            defaultValue={expense?.dateKey ?? defaultDateKey}
            required
          />
        </Field>

        <div>
          <p className="mb-1.5 block text-[13px] font-medium text-ink-soft">
            Recorrência
          </p>
          <input type="hidden" name="recurrence" value={recurrence} />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["AVULSA", "Avulsa"],
                ["FIXA_MENSAL", "Fixa mensal"],
              ] as [Recurrence, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={recurrence === key}
                onClick={() => setRecurrence(key)}
                className={cn(
                  "h-11 rounded-xl border text-[15px] font-medium transition-colors select-none",
                  recurrence === key
                    ? "border-accent bg-accent text-accent-ink shadow-sm"
                    : "border-line bg-surface text-ink-soft active:bg-surface-sunken",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            {recurrence === "FIXA_MENSAL"
              ? "Entra sozinha todo mês, no mesmo dia."
              : "Fixa mensal entra sozinha todo mês (ex.: aluguel)."}
          </p>
        </div>

        <Button size="lg" disabled={busy}>
          {pending
            ? "Salvando..."
            : editing
              ? "Salvar alterações"
              : "Lançar despesa"}
        </Button>
      </form>

      {editing && expense ? (
        <div className="mt-4 border-t border-line pt-4 pb-1">
          {deleteState.error ? (
            <div className="mb-3">
              <ErrorBox message={deleteState.error} />
            </div>
          ) : null}

          {confirmDelete ? (
            <div className="grid gap-2">
              <p className="text-center text-sm text-ink-soft">
                Excluir esta despesa? Essa ação não pode ser desfeita.
              </p>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={expense.id} />
                <Button variant="danger" size="lg" disabled={busy}>
                  {deleting ? "Excluindo..." : "Excluir despesa"}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                Manter despesa
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="danger-soft"
              size="lg"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Excluir despesa
            </Button>
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
