"use client";

/**
 * Formulário da anamnese digital — respondido no celular da profissional e
 * entregue à cliente: toggles grandes sim/não, detalhe quando "sim",
 * condição dos fios, termo de consentimento, LGPD e assinatura no canvas.
 */
import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { IconCheck } from "@/components/ui/icons";
import {
  saveAnamnesisAction,
  type AnamnesisState,
} from "@/app/(app)/clientes/[id]/anamnese/actions";
import {
  ANAMNESIS_QUESTIONS,
  type AnamnesisQuestionId,
  type ParsedAnamnesis,
} from "./questions";
import { SignaturePad } from "./signature-pad";
import { ConsentEditor } from "./consent-editor";

type AnswerDraft = { sim: boolean | null; detalhe: string };

function buildInitialAnswers(
  initial: ParsedAnamnesis | null,
): Record<AnamnesisQuestionId, AnswerDraft> {
  const out = {} as Record<AnamnesisQuestionId, AnswerDraft>;
  for (const q of ANAMNESIS_QUESTIONS) {
    const r = initial?.respostas[q.id];
    out[q.id] = { sim: r ? r.sim : null, detalhe: r?.detalhe ?? "" };
  }
  return out;
}

const initialState: AnamnesisState = {};

export function AnamnesisForm({
  clientId,
  clientName,
  consentText,
  initial,
  naturalInitial,
  hasExistingSignature,
  lastSignedAtLabel,
}: {
  clientId: string;
  clientName: string;
  /** Termo em vigor (personalizado da profissional ou padrão). */
  consentText: string;
  initial: ParsedAnamnesis | null;
  naturalInitial: string | null;
  /** Atualização: já existe assinatura registrada → assinar de novo é opcional. */
  hasExistingSignature: boolean;
  lastSignedAtLabel: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveAnamnesisAction, initialState);

  const [answers, setAnswers] = useState(() => buildInitialAnswers(initial));
  const [ciano, setCiano] = useState(initial?.alergiaCianoacrilato ?? false);
  const [condition, setCondition] = useState<string>(naturalInitial ?? "");
  const [lgpd, setLgpd] = useState(initial != null);
  const [signature, setSignature] = useState<Blob | null>(null);

  function setAnswer(id: AnamnesisQuestionId, patch: Partial<AnswerDraft>) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  const allAnswered = ANAMNESIS_QUESTIONS.every((q) => answers[q.id].sim !== null);
  const needsSignature = !hasExistingSignature && !signature;
  const pendencias = [
    !allAnswered && "responda todas as perguntas",
    !lgpd && "marque a autorização LGPD",
    needsSignature && "colha a assinatura",
  ].filter((p): p is string => Boolean(p));
  const canSubmit = pendencias.length === 0;

  // Injeta a assinatura (PNG do canvas) no FormData antes de despachar.
  function submit(formData: FormData) {
    if (signature) {
      formData.set(
        "assinatura",
        new File([signature], "assinatura.png", { type: "image/png" }),
      );
    }
    formAction(formData);
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      {ANAMNESIS_QUESTIONS.map((q) => (
        <input
          key={q.id}
          type="hidden"
          name={`q_${q.id}`}
          value={answers[q.id].sim === null ? "" : answers[q.id].sim ? "sim" : "nao"}
        />
      ))}
      <input type="hidden" name="alergiaCianoacrilato" value={ciano ? "1" : ""} />
      <input type="hidden" name="naturalLashCondition" value={condition} />
      <input type="hidden" name="lgpd" value={lgpd ? "1" : ""} />

      {/* Saúde e histórico */}
      <Card>
        <CardBody>
          <h2 className="font-display text-base font-semibold text-ink">Saúde e histórico</h2>
          <p className="text-xs text-ink-soft mt-0.5 mb-1">
            Responda com a cliente, uma pergunta por vez.
          </p>
          <div>
            {ANAMNESIS_QUESTIONS.map((q, index) => (
              <div
                key={q.id}
                className={cn(
                  "py-4",
                  index < ANAMNESIS_QUESTIONS.length - 1 && "border-b border-line",
                )}
              >
                <p className="text-[15px] font-medium text-ink leading-snug">{q.label}</p>
                {q.hint ? <p className="text-xs text-ink-faint mt-0.5">{q.hint}</p> : null}

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <ToggleOption
                    label="Não"
                    selected={answers[q.id].sim === false}
                    onClick={() => setAnswer(q.id, { sim: false })}
                  />
                  <ToggleOption
                    label="Sim"
                    selected={answers[q.id].sim === true}
                    onClick={() => setAnswer(q.id, { sim: true })}
                  />
                </div>

                {answers[q.id].sim === true ? (
                  <div className="mt-2.5 space-y-2.5">
                    <Textarea
                      name={`d_${q.id}`}
                      value={answers[q.id].detalhe}
                      onChange={(e) => setAnswer(q.id, { detalhe: e.target.value })}
                      placeholder={q.detailPlaceholder}
                      className="min-h-16"
                      maxLength={600}
                    />
                    {q.id === "alergias" ? (
                      <BigCheckbox
                        checked={ciano}
                        onChange={setCiano}
                        label="Alergia a cianoacrilato"
                        hint="Componente da cola de extensão — contraindicação."
                        danger
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Condição dos fios naturais */}
      <Card>
        <CardBody>
          <h2 className="font-display text-base font-semibold text-ink mb-3">
            Condição dos fios naturais
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(NATURAL_LASH_CONDITIONS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={condition === value}
                onClick={() => setCondition((prev) => (prev === value ? "" : value))}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors select-none",
                  condition === value
                    ? "bg-accent text-accent-ink border-accent shadow-sm"
                    : "bg-surface text-ink-soft border-line active:bg-surface-sunken",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Termo de consentimento + LGPD + assinatura */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              Termo de consentimento
            </h2>
            <ConsentEditor clientId={clientId} currentText={consentText} />
          </div>
          <div className="mt-2.5 max-h-56 overflow-y-auto rounded-xl bg-surface-sunken px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-ink-soft whitespace-pre-line">
              {consentText}
            </p>
          </div>

          <div className="mt-3">
            <BigCheckbox
              checked={lgpd}
              onChange={setLgpd}
              label="Autorizo o armazenamento dos meus dados de saúde para fins de atendimento (LGPD)"
            />
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-medium text-ink-soft mb-1.5">
              Assinatura de {clientName}
            </p>
            {hasExistingSignature ? (
              <p className="text-xs text-ink-faint mb-2">
                Já existe assinatura registrada
                {lastSignedAtLabel ? ` em ${lastSignedAtLabel}` : ""}. Assine de novo só se
                quiser atualizar — a anterior fica no histórico.
              </p>
            ) : null}
            <SignaturePad onChange={setSignature} />
          </div>
        </CardBody>
      </Card>

      {state.error ? (
        <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">
          {state.error}
        </p>
      ) : null}

      {!canSubmit ? (
        <p className="text-xs text-ink-faint text-center">
          Para salvar: {pendencias.join(" · ")}.
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending || !canSubmit}>
        {pending ? "Salvando..." : "Salvar anamnese"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Peças touch-first                                                   */
/* ------------------------------------------------------------------ */

function ToggleOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl border text-[15px] font-medium transition-colors select-none",
        selected
          ? "bg-accent text-accent-ink border-accent shadow-sm"
          : "bg-surface text-ink-soft border-line active:bg-surface-sunken",
      )}
    >
      {label}
    </button>
  );
}

function BigCheckbox({
  checked,
  onChange,
  label,
  hint,
  danger,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors select-none",
        checked
          ? danger
            ? "border-danger/40 bg-danger-soft"
            : "border-accent/50 bg-accent-soft"
          : "border-line bg-surface active:bg-surface-sunken",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked
            ? danger
              ? "border-danger bg-danger text-white"
              : "border-accent bg-accent text-accent-ink"
            : "border-line bg-surface",
        )}
      >
        {checked ? <IconCheck width={13} height={13} /> : null}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-medium leading-snug",
            checked && danger ? "text-danger" : "text-ink",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span
            className={cn(
              "block text-xs mt-0.5",
              checked && danger ? "text-danger/80" : "text-ink-faint",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}
