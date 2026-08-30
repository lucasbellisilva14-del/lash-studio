"use client";

/**
 * Sheet de criação/edição de serviço — o mesmo formulário atende os dois casos
 * (com `service` preenchido = edição, com hidden input `id`).
 */
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconAlert, IconPlus } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { formatBRL, parseBRL } from "@/lib/money";
import { saveService, type ServiceActionState } from "@/app/(app)/servicos/actions";
import { IconMinus } from "@/components/servicos/icons";
import { formatDurationMin, type ServiceItem } from "@/components/servicos/types";

const DURATION_SHORTCUTS = [60, 90, 120, 150, 180] as const;
const DURATION_STEP = 15;
const DURATION_MAX = 600;

const initialState: ServiceActionState = { ok: false, error: null };

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ServiceFormSheet({
  service,
  aplicacoes,
  onClose,
  onRequestDeactivate,
}: {
  /** null = novo serviço; preenchido = edição. */
  service: ServiceItem | null;
  /** Serviços ativos de categoria APLICACAO (para vincular manutenção). */
  aplicacoes: { id: string; name: string }[];
  onClose: () => void;
  onRequestDeactivate?: (service: ServiceItem) => void;
}) {
  const editing = service !== null;
  const [state, formAction, pending] = useActionState(saveService, initialState);

  const [category, setCategory] = useState<ServiceCategory>(
    service?.category ?? "APLICACAO",
  );
  const [durationMin, setDurationMin] = useState<number>(service?.durationMin ?? 120);
  const [price, setPrice] = useState<string>(
    service ? centsToInput(service.priceCents) : "",
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const priceCents = parseBRL(price);
  const options = aplicacoes.filter((a) => a.id !== service?.id);

  return (
    <Sheet open onClose={onClose} title={editing ? "Editar serviço" : "Novo serviço"} tall>
      <form action={formAction} className="grid gap-4 pt-1">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}

        {state.error ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
            <p>{state.error}</p>
          </div>
        ) : null}

        <Field label="Nome" htmlFor="service-name">
          <Input
            id="service-name"
            name="name"
            defaultValue={service?.name ?? ""}
            placeholder="Ex.: Volume brasileiro"
            maxLength={80}
            required
          />
        </Field>

        <Field label="Categoria" htmlFor="service-category">
          <Select
            id="service-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceCategory)}
          >
            {(Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((key) => (
              <option key={key} value={key}>
                {SERVICE_CATEGORIES[key]}
              </option>
            ))}
          </Select>
        </Field>

        {category === "MANUTENCAO" ? (
          <Field
            label="Manutenção de qual aplicação?"
            htmlFor="service-maintenance-of"
            hint="A manutenção fica vinculada ao ciclo dessa aplicação."
          >
            {options.length > 0 ? (
              <Select
                id="service-maintenance-of"
                name="maintenanceOfId"
                defaultValue={service?.maintenanceOfId ?? ""}
                required
              >
                <option value="" disabled>
                  Escolha a aplicação
                </option>
                {options.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
                Nenhum serviço de aplicação ativo. Cadastre a aplicação primeiro para
                vincular a manutenção.
              </p>
            )}
          </Field>
        ) : null}

        <Field
          label="Duração"
          htmlFor="service-duration"
          hint={
            durationMin > 0
              ? `Duração: ${formatDurationMin(durationMin)}`
              : "Em minutos. Use os atalhos ou digite."
          }
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuir 15 minutos"
              onClick={() =>
                setDurationMin((d) => Math.max(DURATION_STEP, d - DURATION_STEP))
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors active:bg-surface-sunken"
            >
              <IconMinus width={18} height={18} />
            </button>
            <Input
              id="service-duration"
              name="durationMin"
              type="number"
              inputMode="numeric"
              min={5}
              max={DURATION_MAX}
              step={5}
              className="text-center"
              value={durationMin === 0 ? "" : durationMin}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDurationMin(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
              }}
              required
            />
            <button
              type="button"
              aria-label="Aumentar 15 minutos"
              onClick={() =>
                setDurationMin((d) => Math.min(DURATION_MAX, d + DURATION_STEP))
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors active:bg-surface-sunken"
            >
              <IconPlus width={18} height={18} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DURATION_SHORTCUTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDurationMin(value)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  durationMin === value
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line bg-surface text-ink-soft active:bg-surface-sunken",
                )}
              >
                {formatDurationMin(value)}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="Preço"
          htmlFor="service-price"
          hint={priceCents > 0 ? `Prévia: ${formatBRL(priceCents)}` : "Ex.: 180 ou 180,00"}
        >
          <Input
            id="service-price"
            name="price"
            inputMode="decimal"
            placeholder="0,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </Field>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
          <span>
            <span className="block text-[15px] font-medium text-ink">Exige sinal</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              Pede pagamento antecipado para confirmar o horário.
            </span>
          </span>
          <input
            type="checkbox"
            name="requiresDeposit"
            defaultChecked={service?.requiresDeposit ?? false}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-7 w-12 shrink-0 rounded-full border border-line bg-surface-sunken transition-colors after:absolute after:left-1 after:top-1/2 after:h-5 after:w-5 after:-translate-y-1/2 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-[18px]"
          />
        </label>

        <div className="mt-1 grid gap-2">
          <Button size="lg" disabled={pending}>
            {pending ? "Salvando..." : editing ? "Salvar alterações" : "Criar serviço"}
          </Button>
          {editing && onRequestDeactivate && service ? (
            <Button
              type="button"
              variant="danger-soft"
              size="lg"
              disabled={pending}
              onClick={() => onRequestDeactivate(service)}
            >
              Desativar serviço
            </Button>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
