"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAYS_PT } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { salvarHorariosAction } from "./actions";

export type DayDefaults = {
  weekday: number;
  active: boolean;
  startTime: string;
  endTime: string;
};

/** Ordem de exibição: segunda → domingo. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function Switch({
  checked,
  onChange,
  name,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  label: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        className={cn(
          "block h-7 w-12 rounded-full border transition-colors",
          "after:content-[''] after:absolute after:top-1 after:left-1 after:h-5 after:w-5",
          "after:rounded-full after:bg-white after:shadow after:transition-transform",
          checked
            ? "bg-accent border-accent after:translate-x-5"
            : "bg-surface-sunken border-line",
        )}
      />
    </label>
  );
}

export function HorariosForm({
  days: initialDays,
  bufferMinutes,
  minAdvanceHours,
}: {
  days: DayDefaults[];
  bufferMinutes: number;
  minAdvanceHours: number;
}) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    salvarHorariosAction,
    initialConfigFormState,
  );
  const [days, setDays] = useState(initialDays);

  function patchDay(weekday: number, patch: Partial<DayDefaults>) {
    setDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)),
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card className="divide-y divide-line overflow-hidden">
        {DISPLAY_ORDER.map((weekday) => {
          const day = days.find((d) => d.weekday === weekday);
          if (!day) return null;
          return (
            <div key={weekday} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Switch
                  name={`active-${weekday}`}
                  checked={day.active}
                  onChange={(active) => patchDay(weekday, { active })}
                  label={`Atender ${WEEKDAYS_PT[weekday]}`}
                />
                <span
                  className={cn(
                    "grow font-medium text-[15px] transition-colors",
                    day.active ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {WEEKDAYS_PT[weekday]}
                </span>
                <div
                  className={cn(
                    "flex items-center gap-1.5 transition-opacity",
                    day.active ? "opacity-100" : "opacity-40",
                  )}
                >
                  <Input
                    type="time"
                    name={`start-${weekday}`}
                    value={day.startTime}
                    onChange={(e) => patchDay(weekday, { startTime: e.target.value })}
                    aria-label={`Início de ${WEEKDAYS_PT[weekday]}`}
                    className="w-[5.25rem] h-10 px-2 text-center tabular-nums"
                  />
                  <span className="text-ink-faint text-sm">–</span>
                  <Input
                    type="time"
                    name={`end-${weekday}`}
                    value={day.endTime}
                    onChange={(e) => patchDay(weekday, { endTime: e.target.value })}
                    aria-label={`Fim de ${WEEKDAYS_PT[weekday]}`}
                    className="w-[5.25rem] h-10 px-2 text-center tabular-nums"
                  />
                </div>
              </div>
              <FieldError message={errors[`day-${weekday}`]} />
            </div>
          );
        })}
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Ritmo da agenda
          </h2>

          <Field
            label="Respiro entre atendimentos"
            htmlFor="bufferMinutes"
            hint="Tempo reservado entre uma cliente e outra para higienizar e descansar."
          >
            <div className="relative">
              <Input
                id="bufferMinutes"
                name="bufferMinutes"
                type="number"
                inputMode="numeric"
                min={0}
                max={240}
                step={5}
                defaultValue={bufferMinutes}
                className="pr-12"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                min
              </span>
            </div>
            <FieldError message={errors.bufferMinutes} />
          </Field>

          <Field
            label="Antecedência mínima para agendar"
            htmlFor="minAdvanceHours"
            hint="Evita encaixes de última hora sem o seu aval."
          >
            <div className="relative">
              <Input
                id="minAdvanceHours"
                name="minAdvanceHours"
                type="number"
                inputMode="numeric"
                min={0}
                max={168}
                defaultValue={minAdvanceHours}
                className="pr-10"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                h
              </span>
            </div>
            <FieldError message={errors.minAdvanceHours} />
          </Field>
        </CardBody>
      </Card>

      <FormError error={state.error} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar horários"}
      </Button>

      <SavedToast savedAt={state.savedAt} message="Horários salvos!" />
    </form>
  );
}
