"use client";

/**
 * Sheet de criação/edição de serviço — o mesmo formulário atende os dois casos
 * (com `service` preenchido = edição, com hidden input `id`).
 */
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { IconAlert, IconInfo, IconPlus } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { formatBRL, parseBRL } from "@/lib/money";
import { saveService, type ServiceActionState } from "@/app/(app)/servicos/actions";
import { IconMinus } from "@/components/servicos/icons";
import {
  acceptsReturnDays,
  formatDurationMin,
  RETURN_DAYS_SUGGESTED,
  type ServiceItem,
} from "@/components/servicos/types";

const DURATION_SHORTCUTS = [60, 90, 120, 150, 180] as const;
const DURATION_STEP = 15;
const DURATION_MAX = 600;
const RETURN_SHORTCUTS = [15, 20, 30, 45, 60] as const;
const FORM_ID = "service-form";

const initialState: ServiceActionState = { ok: false, error: null };

const stepperClasses =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft " +
  "transition-colors hover:border-line-strong hover:text-ink active:bg-surface-sunken";

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

  // Retorno ideal: na categoria original vale o que está salvo; ao trocar de
  // categoria (sem ter mexido no campo), entra a sugestão da nova categoria.
  const returnFor = (cat: ServiceCategory): string => {
    if (service && cat === service.category) {
      return service.returnDays != null ? String(service.returnDays) : "";
    }
    const suggestion = RETURN_DAYS_SUGGESTED[cat];
    return suggestion != null ? String(suggestion) : "";
  };
  const [returnDays, setReturnDays] = useState<string>(() =>
    returnFor(service?.category ?? "APLICACAO"),
  );
  const [returnTouched, setReturnTouched] = useState(false);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const changeCategory = (next: ServiceCategory) => {
    setCategory(next);
    if (!returnTouched) setReturnDays(returnFor(next));
  };
  const changeReturnDays = (value: string) => {
    setReturnTouched(true);
    setReturnDays(value.replace(/\D/g, "").slice(0, 3));
  };

  const priceCents = parseBRL(price);
  const options = aplicacoes.filter((a) => a.id !== service?.id);
  const isLashCycle = category === "APLICACAO" || category === "MANUTENCAO";

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? "Editar serviço" : "Novo serviço"}
      description={
        editing
          ? "As mudanças valem para os próximos agendamentos."
          : "Ele aparece na sua agenda e no seu link de agendamento."
      }
      tall
      footer={
        <div className="space-y-2.5">
          {state.error ? (
            <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger">
              <IconAlert width={16} height={16} className="mt-px shrink-0" />
              {state.error}
            </p>
          ) : null}
          <Button type="submit" form={FORM_ID} size="lg" disabled={pending}>
            {pending ? "Salvando..." : editing ? "Salvar alterações" : "Criar serviço"}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} action={formAction} className="space-y-5">
        {service ? <input type="hidden" name="id" value={service.id} /> : null}

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
            onChange={(e) => changeCategory(e.target.value as ServiceCategory)}
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
              <p className="rounded-[14px] bg-warning-soft px-3.5 py-3 text-[13px] leading-snug text-warning">
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
              className={stepperClasses}
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
              className="text-center tabular-nums"
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
              className={stepperClasses}
            >
              <IconPlus width={18} height={18} />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DURATION_SHORTCUTS.map((value) => (
              <Chip
                key={value}
                size="sm"
                selected={durationMin === value}
                onClick={() => setDurationMin(value)}
              >
                {formatDurationMin(value)}
              </Chip>
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

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-line px-3.5 py-3 transition-colors hover:border-line-strong">
          <span>
            <span className="block text-[14.5px] font-semibold text-ink">Exige sinal</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
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
            className="relative h-7 w-12 shrink-0 rounded-full bg-line-strong transition-colors duration-150 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform after:duration-150 after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent/20"
          />
        </label>

        {acceptsReturnDays(category) ? (
          <Field
            label="Retorno ideal (dias)"
            htmlFor="service-return-days"
            hint="Quando a cliente deve voltar depois desse serviço. No dia, ela aparece na Fila com a mensagem de retorno."
          >
            <Input
              id="service-return-days"
              name="returnDays"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="Sem aviso"
              className="tabular-nums"
              value={returnDays}
              onChange={(e) => changeReturnDays(e.target.value)}
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {RETURN_SHORTCUTS.map((days) => (
                <Chip
                  key={days}
                  size="sm"
                  selected={returnDays === String(days)}
                  onClick={() => changeReturnDays(String(days))}
                >
                  {days} dias
                </Chip>
              ))}
            </div>
          </Field>
        ) : isLashCycle ? (
          <p className="flex items-start gap-2.5 rounded-[14px] bg-surface-sunken px-3.5 py-3 text-[13px] leading-snug text-ink-soft">
            <IconInfo width={16} height={16} className="mt-px shrink-0" />
            Aplicação e manutenção seguem o prazo de manutenção das Políticas.
          </p>
        ) : null}

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
      </form>
    </Sheet>
  );
}
