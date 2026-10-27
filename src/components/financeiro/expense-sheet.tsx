"use client";

/**
 * Sheet de despesa — o mesmo formulário cria (sem `expense`), cria já
 * preenchida (`preset`, ex.: pagamento de comissão) e edita (`expense`, com
 * hidden input `id`). A ação principal fica no rodapé fixo; a exclusão, em
 * duas etapas, num formulário separado.
 */
import { useActionState, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { IconAlert } from "@/components/ui/icons";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatBRL, parseBRL } from "@/lib/money";
import {
  deleteExpense,
  saveExpense,
  type FinanceiroActionState,
} from "@/app/(app)/financeiro/actions";
import type { ExpenseCategory, ExpenseDraft, ExpensePreset, Recurrence } from "./types";

const initialState: FinanceiroActionState = { ok: false, error: null };

const RECORRENCIAS = [
  { value: "AVULSA", label: "Avulsa" },
  { value: "FIXA_MENSAL", label: "Fixa mensal" },
] as const satisfies readonly { value: Recurrence; label: string }[];

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-sm text-danger"
    >
      <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export function ExpenseSheet({
  expense,
  preset = null,
  defaultDateKey,
  onClose,
}: {
  /** null = nova despesa; preenchido = edição. */
  expense: ExpenseDraft | null;
  /** Nova despesa já preenchida (ignorado na edição). */
  preset?: ExpensePreset | null;
  /** "yyyy-MM-dd" de hoje (data padrão da nova despesa). */
  defaultDateKey: string;
  onClose: () => void;
}) {
  const formId = useId();
  const editing = expense !== null;
  const inicial = expense ?? preset;
  const [state, formAction, pending] = useActionState(saveExpense, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteExpense, initialState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [amount, setAmount] = useState(inicial ? centsToInput(inicial.amountCents) : "");
  const [recurrence, setRecurrence] = useState<Recurrence>(expense?.recurrence ?? "AVULSA");

  useEffect(() => {
    if (state.ok || deleteState.ok) onClose();
  }, [state.ok, deleteState.ok, onClose]);

  const amountCents = parseBRL(amount);
  const busy = pending || deleting;

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? "Editar despesa" : "Nova despesa"}
      description={
        editing
          ? "As mudanças valem para o mês da data escolhida."
          : (preset?.note ?? "Entra nas despesas pagas do mês da data escolhida.")
      }
      tall
      footer={
        <Button type="submit" form={formId} size="lg" disabled={busy}>
          {pending ? "Salvando..." : editing ? "Salvar alterações" : "Lançar despesa"}
        </Button>
      }
    >
      <form id={formId} action={formAction} className="grid gap-4">
        {expense ? <input type="hidden" name="id" value={expense.id} /> : null}

        {state.error ? <ErrorBox message={state.error} /> : null}

        <Field label="Descrição" htmlFor={`${formId}-description`}>
          <Input
            id={`${formId}-description`}
            name="description"
            defaultValue={inicial?.description ?? ""}
            placeholder="Ex.: Cola nova, aluguel do estúdio"
            maxLength={80}
            required
          />
        </Field>

        <Field label="Categoria" htmlFor={`${formId}-category`}>
          <Select
            id={`${formId}-category`}
            name="category"
            defaultValue={inicial?.category ?? "MATERIAL"}
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
          htmlFor={`${formId}-amount`}
          hint={amountCents > 0 ? `Prévia: ${formatBRL(amountCents)}` : "Ex.: 89,90"}
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
              R$
            </span>
            <Input
              id={`${formId}-amount`}
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

        <Field label="Data" htmlFor={`${formId}-date`} hint="O dia em que o dinheiro saiu.">
          <Input
            id={`${formId}-date`}
            name="date"
            type="date"
            defaultValue={expense?.dateKey ?? defaultDateKey}
            required
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Recorrência</p>
          <Segmented
            options={RECORRENCIAS}
            value={recurrence}
            onChange={setRecurrence}
            name="recurrence"
          />
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
            {recurrence === "FIXA_MENSAL"
              ? "Entra sozinha todo mês, no mesmo dia."
              : "Fixa mensal entra sozinha todo mês (ex.: aluguel)."}
          </p>
        </div>
      </form>

      {editing && expense ? (
        <div className="mt-5 border-t border-line pt-4">
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
