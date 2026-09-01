"use client";

/**
 * Sheet de criação/edição de insumo. Em edição, mostra também
 * "Abrir cola nova" (colas), o histórico de movimentações e desativar/reativar.
 */
import { useActionState, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconAlert } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { CURVATURES, PRODUCT_CATEGORIES, THICKNESSES } from "@/lib/constants";
import { formatBRL, parseBRL } from "@/lib/money";
import {
  deactivateProductAction,
  openGlueAction,
  reactivateProductAction,
  saveProductAction,
  type EstoqueActionState,
} from "@/app/(app)/estoque/actions";
import { IconDroplet, IconHistory } from "@/components/estoque/icons";
import {
  formatQty,
  GLUE_SHELF_LIFE_DEFAULT,
  PRODUCT_UNIT_LABELS,
  PRODUCT_UNITS,
  type MovementItem,
  type ProductCategory,
  type ProductItem,
} from "@/components/estoque/types";

const initialState: EstoqueActionState = { ok: false, error: null };

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ProductFormSheet({
  product,
  onClose,
}: {
  /** null = novo insumo; preenchido = edição. */
  product: ProductItem | null;
  onClose: () => void;
}) {
  const editing = product !== null;
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);

  const [category, setCategory] = useState<ProductCategory>(
    product?.category ?? "FIOS",
  );
  const [cost, setCost] = useState<string>(
    product?.costCents != null ? centsToInput(product.costCents) : "",
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const costCents = parseBRL(cost);

  return (
    <Sheet open onClose={onClose} title={editing ? "Editar insumo" : "Novo insumo"} tall>
      <form action={formAction} className="grid gap-4 pt-1">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        {state.error ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
            <p>{state.error}</p>
          </div>
        ) : null}

        <Field label="Nome" htmlFor="product-name">
          <Input
            id="product-name"
            name="name"
            defaultValue={product?.name ?? ""}
            placeholder="Ex.: Fio de seda 0.07 D"
            maxLength={80}
            required
          />
        </Field>

        <Field label="Categoria" htmlFor="product-category">
          <Select
            id="product-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
          >
            {(Object.keys(PRODUCT_CATEGORIES) as ProductCategory[]).map((key) => (
              <option key={key} value={key}>
                {PRODUCT_CATEGORIES[key]}
              </option>
            ))}
          </Select>
        </Field>

        {category === "FIOS" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Curvatura" htmlFor="product-curvatura">
                <Select
                  id="product-curvatura"
                  name="curvatura"
                  defaultValue={product?.spec?.curvatura ?? ""}
                >
                  <option value="">—</option>
                  {CURVATURES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Espessura" htmlFor="product-espessura">
                <Select
                  id="product-espessura"
                  name="espessura"
                  defaultValue={product?.spec?.espessura ?? ""}
                >
                  <option value="">—</option>
                  {THICKNESSES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tamanho" htmlFor="product-tamanho">
              <Input
                id="product-tamanho"
                name="tamanho"
                defaultValue={product?.spec?.tamanho ?? ""}
                placeholder="Ex.: 9mm ou mix 8–13"
                maxLength={40}
              />
            </Field>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidade" htmlFor="product-unit">
            <Select id="product-unit" name="unit" defaultValue={product?.unit ?? "un"}>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {PRODUCT_UNIT_LABELS[u]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estoque mínimo" htmlFor="product-min">
            <Input
              id="product-min"
              name="minQuantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={product ? product.minQuantity : 1}
              required
            />
          </Field>
        </div>

        {editing ? (
          <p className="-mt-2 text-xs text-ink-faint">
            Em estoque: {formatQty(product.quantity)} {product.unit} — ajuste pelas
            movimentações de entrada e baixa.
          </p>
        ) : (
          <Field label="Quantidade inicial" htmlFor="product-quantity">
            <Input
              id="product-quantity"
              name="quantity"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={0}
              required
            />
          </Field>
        )}

        <Field
          label="Custo (opcional)"
          htmlFor="product-cost"
          hint={costCents > 0 ? `Prévia: ${formatBRL(costCents)}` : "Ex.: 89 ou 89,90"}
        >
          <Input
            id="product-cost"
            name="cost"
            inputMode="decimal"
            placeholder="0,00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>

        <Field
          label="Consumo médio por atendimento"
          htmlFor="product-usage"
          hint="Baixa automática ao registrar o recebimento do atendimento. Deixe 0 para não baixar."
        >
          <Input
            id="product-usage"
            name="usagePerService"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            defaultValue={product?.usagePerService ?? 0}
          />
        </Field>

        {category === "COLA" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de abertura" htmlFor="product-opened">
              <Input
                id="product-opened"
                name="openedAt"
                type="date"
                defaultValue={product?.openedAtKey ?? ""}
              />
            </Field>
            <Field
              label="Validade pós-abertura"
              htmlFor="product-shelf"
              hint="Em dias — 4 a 6 semanas."
            >
              <Input
                id="product-shelf"
                name="shelfLifeDaysAfterOpen"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                defaultValue={product?.shelfLifeDaysAfterOpen ?? GLUE_SHELF_LIFE_DEFAULT}
                required
              />
            </Field>
          </div>
        ) : null}

        <Field
          label="Validade do produto (opcional)"
          htmlFor="product-expires"
          hint="Data impressa na embalagem."
        >
          <Input
            id="product-expires"
            name="expiresAt"
            type="date"
            defaultValue={product?.expiresAtKey ?? ""}
          />
        </Field>

        <Button size="lg" disabled={pending}>
          {pending ? "Salvando..." : editing ? "Salvar alterações" : "Criar insumo"}
        </Button>
      </form>

      {editing ? (
        <div className="mt-4 grid gap-4 border-t border-line pt-4">
          {product.category === "COLA" && product.active ? (
            <OpenGlueForm product={product} onDone={onClose} />
          ) : null}

          <MovementsHistory movements={product.movements} unit={product.unit} />

          {product.active ? (
            <DeactivateForm productId={product.id} onDone={onClose} />
          ) : (
            <ReactivateForm productId={product.id} onDone={onClose} />
          )}
        </div>
      ) : null}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Abrir cola nova                                                     */
/* ------------------------------------------------------------------ */

function OpenGlueForm({
  product,
  onDone,
}: {
  product: ProductItem;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(openGlueAction, initialState);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="grid gap-1.5">
      <input type="hidden" name="id" value={product.id} />
      <Button type="submit" variant="secondary" size="lg" disabled={pending}>
        <IconDroplet width={18} height={18} />
        {pending ? "Registrando..." : "Abrir cola nova"}
      </Button>
      <p className="text-xs text-ink-faint">
        Zera a data de abertura para hoje — use ao abrir um frasco novo.
      </p>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Histórico de movimentações                                          */
/* ------------------------------------------------------------------ */

const MOVEMENT_LABELS: Record<MovementItem["type"], string> = {
  ENTRADA: "Entrada",
  BAIXA: "Baixa",
  AJUSTE: "Ajuste",
};

function MovementsHistory({
  movements,
  unit,
}: {
  movements: MovementItem[];
  unit: string;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
        <IconHistory width={14} height={14} />
        Últimas movimentações
      </h3>
      {movements.length === 0 ? (
        <p className="text-sm text-ink-faint">Nenhuma movimentação registrada.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Badge
                tone={
                  m.type === "ENTRADA"
                    ? "success"
                    : m.type === "BAIXA"
                      ? "danger"
                      : "neutral"
                }
              >
                {m.type === "ENTRADA" ? "+" : m.type === "BAIXA" ? "−" : "±"}
                {formatQty(m.quantity)} {unit}
              </Badge>
              <span className="min-w-0 grow">
                <span className="block truncate text-sm text-ink">
                  {m.reason ?? MOVEMENT_LABELS[m.type]}
                </span>
                <span className="block text-xs text-ink-faint">{m.dateLabel}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Desativar / reativar                                                */
/* ------------------------------------------------------------------ */

function DeactivateForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deactivateProductAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="grid gap-1.5">
      <input type="hidden" name="id" value={productId} />
      <Button type="submit" variant="danger-soft" size="lg" disabled={pending}>
        {pending ? "Desativando..." : "Desativar insumo"}
      </Button>
      <p className="text-xs text-ink-faint">
        Sai das listas e da baixa automática. O histórico fica guardado e você pode
        reativar quando quiser.
      </p>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}

function ReactivateForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    reactivateProductAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="grid gap-1.5">
      <input type="hidden" name="id" value={productId} />
      <Button type="submit" variant="secondary" size="lg" disabled={pending}>
        {pending ? "Reativando..." : "Reativar insumo"}
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
