"use client";

/**
 * Formulário da anamnese digital, respondido no celular da profissional com
 * a cliente. As perguntas são o modelo da profissional (ou o padrão) e vão
 * junto no envio como o retrato do dia. Depois: condição dos fios, termo de
 * consentimento, LGPD e assinatura no canvas.
 *
 * Só tipos vêm de @/lib/domain/anamnesis-model (o módulo usa zod, que fica no
 * servidor). Todo valor enviado sai de campos ocultos controlados pelo estado.
 */
import {
  Fragment,
  useActionState,
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import type {
  AnamnesisAnswers,
  AnamnesisLimits,
  AnamnesisQuestion,
} from "@/lib/domain/anamnesis-model";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IconAlert, IconEdit } from "@/components/ui/icons";
import {
  saveAnamnesisAction,
  type AnamnesisState,
} from "@/app/(app)/clientes/[id]/anamnese/actions";
import { SignaturePad } from "./signature-pad";
import { ConsentEditorSheet } from "./consent-editor";
import { CheckRow } from "./check-row";

type AnswerLimits = Pick<AnamnesisLimits, "detail" | "shortAnswer" | "longAnswer">;

/** Resposta sendo preenchida (cada tipo usa o seu campo). */
type Draft = { sim: boolean | null; detalhe: string; texto: string; opcao: string };

const EMPTY_DRAFT: Draft = { sim: null, detalhe: "", texto: "", opcao: "" };

function buildDrafts(
  questions: readonly AnamnesisQuestion[],
  answers: AnamnesisAnswers | null,
): Record<string, Draft> {
  const out: Record<string, Draft> = {};
  for (const question of questions) {
    const answer = answers?.[question.id];
    out[question.id] = {
      sim: answer && "sim" in answer ? answer.sim : null,
      detalhe: answer && "sim" in answer ? answer.detalhe : "",
      texto: answer && "texto" in answer ? answer.texto : "",
      opcao:
        answer && "opcao" in answer && (question.options ?? []).includes(answer.opcao)
          ? answer.opcao
          : "",
    };
  }
  return out;
}

function isDraftAnswered(question: AnamnesisQuestion, draft: Draft): boolean {
  switch (question.type) {
    case "SIM_NAO":
      return draft.sim !== null;
    case "ESCOLHA":
      return draft.opcao !== "";
    default:
      return draft.texto.trim() !== "";
  }
}

function submitValue(question: AnamnesisQuestion, draft: Draft): string {
  switch (question.type) {
    case "SIM_NAO":
      return draft.sim === null ? "" : draft.sim ? "sim" : "nao";
    case "ESCOLHA":
      return draft.opcao;
    default:
      return draft.texto;
  }
}

/** Enter num campo de uma linha não envia a anamnese no meio do preenchimento. */
function ignoreEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault();
}

const initialState: AnamnesisState = {};

export function AnamnesisForm({
  clientId,
  clientName,
  consentText,
  questions,
  initialAnswers,
  naturalInitial,
  hasExistingSignature,
  lastSignedAtLabel,
  limits,
  canEditModel = true,
}: {
  clientId: string;
  clientName: string;
  /** Termo em vigor (personalizado da profissional ou padrão). */
  consentText: string;
  /** Modelo da profissional (ou o padrão): vira o retrato do dia ao salvar. */
  questions: AnamnesisQuestion[];
  /** Atualização: respostas da anamnese anterior, já no formato destas perguntas. */
  initialAnswers: AnamnesisAnswers | null;
  naturalInitial: string | null;
  /** Atualização: já existe assinatura registrada → assinar de novo é opcional. */
  hasExistingSignature: boolean;
  lastSignedAtLabel: string | null;
  limits: AnswerLimits;
  /** Perguntas e termo são do estúdio: só a dona tem os atalhos para editar. */
  canEditModel?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveAnamnesisAction, initialState);

  const [drafts, setDrafts] = useState(() => buildDrafts(questions, initialAnswers));
  const [condition, setCondition] = useState<string>(naturalInitial ?? "");
  const [lgpd, setLgpd] = useState(initialAnswers !== null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const closeConsent = useCallback(() => setConsentOpen(false), []);

  // O servidor apontou perguntas sem resposta: destaca na tela.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.missing && state.missing.length > 0) setShowMissing(true);
  }

  const modelJson = useMemo(
    () => JSON.stringify({ versao: 1, perguntas: questions }),
    [questions],
  );

  const draftOf = (id: string): Draft => drafts[id] ?? EMPTY_DRAFT;

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), ...patch } }));
  }

  const missingIds = questions
    .filter((q) => q.required && !isDraftAnswered(q, draftOf(q.id)))
    .map((q) => q.id);
  const needsSignature = !hasExistingSignature && !signature;
  const pendencias = [
    missingIds.length === 1 && "responda 1 pergunta obrigatória",
    missingIds.length > 1 && `responda ${missingIds.length} perguntas obrigatórias`,
    !lgpd && "marque a autorização LGPD",
    needsSignature && "colha a assinatura",
  ].filter((p): p is string => Boolean(p));

  // Antes de enviar: aponta o que falta em vez de deixar o botão mudo.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pendencias.length === 0) return;
    event.preventDefault();
    setShowMissing(true);
    const target = missingIds.length > 0 ? `pergunta-${missingIds[0]}` : "anamnese-termo";
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Injeta a assinatura (PNG do canvas) no FormData antes de despachar.
  function submit(formData: FormData) {
    if (signature) {
      formData.set("assinatura", new File([signature], "assinatura.png", { type: "image/png" }));
    }
    formAction(formData);
  }

  return (
    <>
      <form action={submit} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="modelo" value={modelJson} />
        {questions.map((q) => {
          const draft = draftOf(q.id);
          return (
            <Fragment key={q.id}>
              <input type="hidden" name={`q_${q.id}`} value={submitValue(q, draft)} />
              {q.type === "SIM_NAO" && q.followUp && draft.sim === true ? (
                <input type="hidden" name={`d_${q.id}`} value={draft.detalhe} />
              ) : null}
            </Fragment>
          );
        })}
        <input type="hidden" name="naturalLashCondition" value={condition} />
        <input type="hidden" name="lgpd" value={lgpd ? "1" : ""} />

        {/* Saúde e histórico */}
        <Card>
          <CardHeader
            title="Saúde e histórico"
            description="Responda com a cliente, uma pergunta por vez."
            action={
              canEditModel ? (
                <Link href="/config/anamnese" className={buttonClasses("ghost", "sm")}>
                  Editar perguntas
                </Link>
              ) : undefined
            }
          />
          <ol className="divide-y divide-line px-4 sm:px-5">
            {questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                draft={draftOf(question.id)}
                missing={showMissing && missingIds.includes(question.id)}
                limits={limits}
                onChange={(patch) => setDraft(question.id, patch)}
              />
            ))}
          </ol>
        </Card>

        {/* Condição dos fios naturais */}
        <Card>
          <CardHeader
            title="Condição dos fios naturais"
            description="Registre como estão os fios antes da aplicação."
          />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {Object.entries(NATURAL_LASH_CONDITIONS).map(([value, label]) => (
                <Chip
                  key={value}
                  selected={condition === value}
                  onClick={() => setCondition((prev) => (prev === value ? "" : value))}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Termo de consentimento + LGPD + assinatura */}
        <Card id="anamnese-termo" className="scroll-mt-6">
          <CardHeader
            title="Termo de consentimento"
            description="A cliente lê, autoriza e assina."
            action={
              canEditModel ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConsentOpen(true)}>
                  <IconEdit width={15} height={15} /> Editar termo
                </Button>
              ) : undefined
            }
          />
          <CardBody className="space-y-4">
            <div className="max-h-56 overflow-y-auto rounded-[14px] bg-surface-sunken px-3.5 py-3">
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
                {consentText}
              </p>
            </div>

            <div>
              <CheckRow
                checked={lgpd}
                onChange={setLgpd}
                label="Autorizo o armazenamento dos meus dados de saúde para fins de atendimento (LGPD)"
              />
              {showMissing && !lgpd ? (
                <p className="mt-2 text-[12.5px] font-medium text-danger">
                  Marque a autorização para salvar.
                </p>
              ) : null}
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">Assinatura de {clientName}</p>
              {hasExistingSignature ? (
                <p className="mb-2 text-[12.5px] leading-snug text-ink-soft">
                  Já existe assinatura registrada
                  {lastSignedAtLabel ? ` em ${lastSignedAtLabel}` : ""}. Assine de novo só se
                  quiser atualizar; a anterior fica no histórico.
                </p>
              ) : null}
              <SignaturePad onChange={setSignature} />
              {showMissing && needsSignature ? (
                <p className="mt-2 text-[12.5px] font-medium text-danger">
                  Colha a assinatura da cliente para salvar.
                </p>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13.5px] font-medium leading-snug text-danger"
          >
            <IconAlert width={16} height={16} className="mt-px shrink-0" />
            {state.error}
          </p>
        ) : null}

        {pendencias.length > 0 ? (
          <p
            className={cn(
              "text-center text-[13px] leading-snug",
              showMissing ? "font-medium text-danger" : "text-ink-soft",
            )}
          >
            Para salvar: {pendencias.join(" · ")}.
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar anamnese"}
        </Button>
      </form>

      {/* Fora do <form>: o Sheet do termo tem o próprio formulário. */}
      {canEditModel && consentOpen ? (
        <ConsentEditorSheet clientId={clientId} currentText={consentText} onClose={closeConsent} />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Uma pergunta, no controle do seu tipo                               */
/* ------------------------------------------------------------------ */

function QuestionField({
  question,
  draft,
  missing,
  limits,
  onChange,
}: {
  question: AnamnesisQuestion;
  draft: Draft;
  missing: boolean;
  limits: AnswerLimits;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const labelId = `pergunta-${question.id}-texto`;

  return (
    <li id={`pergunta-${question.id}`} className="scroll-mt-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <p id={labelId} className="text-[15px] font-semibold leading-snug text-ink">
          {question.text}
        </p>
        {!question.required ? (
          <span className="mt-0.5 shrink-0 text-[12px] text-ink-faint">Opcional</span>
        ) : null}
      </div>

      <div className="mt-3">
        {question.type === "SIM_NAO" ? (
          <>
            <div role="group" aria-labelledby={labelId} className="grid grid-cols-2 gap-2">
              <Chip
                selected={draft.sim === false}
                onClick={() => onChange({ sim: false })}
                className="w-full"
              >
                Não
              </Chip>
              <Chip
                selected={draft.sim === true}
                onClick={() => onChange({ sim: true })}
                className="w-full"
              >
                Sim
              </Chip>
            </div>
            {draft.sim === true && question.alert ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
                <IconAlert width={14} height={14} className="shrink-0" />
                Vira alerta de contraindicação.
              </p>
            ) : null}
            {draft.sim === true && question.followUp ? (
              <Field
                label={question.followUp}
                htmlFor={`pergunta-${question.id}-detalhe`}
                className="mt-3"
              >
                <Textarea
                  id={`pergunta-${question.id}-detalhe`}
                  value={draft.detalhe}
                  onChange={(e) => onChange({ detalhe: e.target.value })}
                  rows={2}
                  maxLength={limits.detail}
                />
              </Field>
            ) : null}
          </>
        ) : question.type === "TEXTO_CURTO" ? (
          <Input
            aria-labelledby={labelId}
            value={draft.texto}
            onChange={(e) => onChange({ texto: e.target.value })}
            onKeyDown={ignoreEnter}
            maxLength={limits.shortAnswer}
            aria-invalid={missing ? true : undefined}
          />
        ) : question.type === "TEXTO_LONGO" ? (
          <Textarea
            aria-labelledby={labelId}
            value={draft.texto}
            onChange={(e) => onChange({ texto: e.target.value })}
            rows={3}
            maxLength={limits.longAnswer}
            aria-invalid={missing ? true : undefined}
          />
        ) : (
          <div role="radiogroup" aria-labelledby={labelId} className="space-y-2">
            {(question.options ?? []).map((option) => {
              const selected = draft.opcao === option;
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-3 rounded-[14px] border px-3.5 py-3 transition-colors",
                    selected
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name={`opcao_${question.id}`}
                    value={option}
                    checked={selected}
                    onChange={() => onChange({ opcao: option })}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                      "peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent/20",
                      selected ? "border-accent" : "border-line-strong",
                    )}
                  >
                    {selected ? <span className="h-2.5 w-2.5 rounded-full bg-accent" /> : null}
                  </span>
                  <span className="min-w-0 text-[14.5px] leading-snug text-ink">{option}</span>
                </label>
              );
            })}
            {!question.required && draft.opcao ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ opcao: "" })}>
                Limpar escolha
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {missing ? (
        <p className="mt-2 text-[12.5px] font-medium text-danger">Responda esta pergunta.</p>
      ) : null}
    </li>
  );
}
