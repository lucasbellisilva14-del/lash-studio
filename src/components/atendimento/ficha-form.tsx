"use client";

/**
 * Formulário interativo da ficha técnica: técnica, fios, mapping visual,
 * cola, retenção (manutenção), duração e observações.
 */
import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import {
  CURVATURES,
  TECHNIQUES,
  THICKNESSES,
  VOLUME_FACTORS,
  type Technique,
} from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { saveFichaAction, type FichaState } from "@/app/(app)/atendimentos/[appointmentId]/actions";
import { Chip, ChipRow } from "./chips";
import { EyeMapping } from "./eye-mapping";

export type FichaInitial = {
  technique: string | null;
  volumeFactor: string | null;
  curvatures: string[];
  thickness: string | null;
  zones: number[];
  glueBrand: string;
  glueBatch: string;
  retentionPct: number | null;
  durationMin: number | null;
  notes: string;
};

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {hint ? <p className="text-xs text-ink-soft mt-0.5">{hint}</p> : null}
    </div>
  );
}

const initialState: FichaState = {};

export function FichaForm({
  appointmentId,
  initial,
  prefilled,
  isMaintenance,
  serviceDurationMin,
  glueBrands,
  glueBatches,
}: {
  appointmentId: string;
  initial: FichaInitial;
  /** Dados vieram do último atendimento da cliente (ficha ainda vazia). */
  prefilled: boolean;
  isMaintenance: boolean;
  serviceDurationMin: number;
  glueBrands: string[];
  glueBatches: string[];
}) {
  const [state, formAction, pending] = useActionState(saveFichaAction, initialState);

  const [technique, setTechnique] = useState<string | null>(initial.technique);
  const [volumeFactor, setVolumeFactor] = useState<string>(initial.volumeFactor ?? "");
  const [curvatures, setCurvatures] = useState<string[]>(initial.curvatures);
  const [thickness, setThickness] = useState<string | null>(initial.thickness);
  const [zones, setZones] = useState<number[]>(initial.zones);
  const [retention, setRetention] = useState<number>(initial.retentionPct ?? 70);

  function toggleCurvature(c: string) {
    setCurvatures((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="technique" value={technique ?? ""} />
      <input type="hidden" name="thickness" value={thickness ?? ""} />
      <input type="hidden" name="mapping" value={JSON.stringify(zones)} />
      {curvatures.map((c) => (
        <input key={c} type="hidden" name="curvatures" value={c} />
      ))}

      {prefilled ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">
          <IconCheck width={16} height={16} className="shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Carregado do último atendimento</span> — ajuste
            se precisar.
          </p>
        </div>
      ) : null}

      <Card>
        <CardBody>
          <SectionTitle title="Técnica" />
          <ChipRow>
            {(Object.entries(TECHNIQUES) as [Technique, string][]).map(([key, label]) => (
              <Chip
                key={key}
                selected={technique === key}
                onClick={() => setTechnique((prev) => (prev === key ? null : key))}
              >
                {label}
              </Chip>
            ))}
          </ChipRow>
          {technique === "VOLUME_RUSSO" ? (
            <Field label="Fator de volume" htmlFor="volumeFactor" className="mt-4">
              <Select
                id="volumeFactor"
                name="volumeFactor"
                value={volumeFactor}
                onChange={(e) => setVolumeFactor(e.target.value)}
              >
                <option value="">Escolha o fator</option>
                {VOLUME_FACTORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <SectionTitle title="Curvatura" hint="Pode combinar mais de uma" />
            <ChipRow>
              {CURVATURES.map((c) => (
                <Chip key={c} small selected={curvatures.includes(c)} onClick={() => toggleCurvature(c)}>
                  {c}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <div>
            <SectionTitle title="Espessura" />
            <ChipRow>
              {THICKNESSES.map((t) => (
                <Chip
                  key={t}
                  small
                  selected={thickness === t}
                  onClick={() => setThickness((prev) => (prev === t ? null : t))}
                >
                  {t}
                </Chip>
              ))}
            </ChipRow>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle
            title="Mapping"
            hint="Tamanho dos fios por zona, do canto interno ao externo"
          />
          <EyeMapping zones={zones} onChange={setZones} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <SectionTitle title="Cola" hint="Marca e lote — rastreabilidade em caso de reação" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" htmlFor="glueBrand">
              <Input
                id="glueBrand"
                name="glueBrand"
                list="glue-brands"
                defaultValue={initial.glueBrand}
                placeholder="Ex.: Elite HS-10"
                autoComplete="off"
              />
            </Field>
            <Field label="Lote" htmlFor="glueBatch">
              <Input
                id="glueBatch"
                name="glueBatch"
                list="glue-batches"
                defaultValue={initial.glueBatch}
                placeholder="Ex.: L2408-31"
                autoComplete="off"
              />
            </Field>
          </div>
          <datalist id="glue-brands">
            {glueBrands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <datalist id="glue-batches">
            {glueBatches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </CardBody>
      </Card>

      {isMaintenance ? (
        <Card>
          <CardBody>
            <SectionTitle
              title="Retenção observada"
              hint="Quanto da aplicação anterior ainda estava no olhar"
            />
            <div className="flex items-center gap-4">
              <input
                type="range"
                name="retentionPct"
                min={0}
                max={100}
                step={5}
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                className="w-full accent-accent"
                aria-label="Retenção observada em porcentagem"
              />
              <span className="w-14 shrink-0 text-right font-display text-xl font-semibold text-ink">
                {retention}%
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-4">
          <SectionTitle title="Sessão" />
          <Field
            label="Duração real (min)"
            htmlFor="durationMin"
            hint={`Prevista para este serviço: ${serviceDurationMin} min`}
          >
            <Input
              id="durationMin"
              name="durationMin"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              step={5}
              defaultValue={initial.durationMin ?? ""}
              placeholder={String(serviceDurationMin)}
            />
          </Field>
          <Field label="Observações" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={initial.notes}
              placeholder="Sensibilidade, preferências da cliente, ajustes para a próxima..."
            />
          </Field>
        </CardBody>
      </Card>

      <div
        className={cn(
          "sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10",
          "pt-3 pb-1 bg-gradient-to-t from-background via-background/90 to-transparent",
        )}
      >
        {state.success ? (
          <p className="mb-2 flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
            <IconCheck width={16} height={16} className="shrink-0" />
            {state.success}
          </p>
        ) : null}
        {state.error ? (
          <p className="mb-2 flex items-center gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <IconAlert width={16} height={16} className="shrink-0" />
            {state.error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg shadow-accent/25">
          {pending ? "Salvando..." : "Salvar ficha"}
        </Button>
      </div>
    </form>
  );
}
