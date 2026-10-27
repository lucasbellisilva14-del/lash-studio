"use client";

/**
 * Editor do modelo de anamnese (/config/anamnese). Cada pergunta é um cartão
 * que abre para editar texto, tipo, "se sim, perguntar…", obrigatória e
 * alerta, além de subir, descer e excluir. Embaixo: "+ Adicionar pergunta",
 * "Restaurar modelo padrão" (com confirmação) e a barra fixa "Salvar modelo".
 *
 * Só tipos vêm de @/lib/domain/anamnesis-model (o módulo usa zod, que fica no
 * servidor). O servidor valida de novo e devolve o modelo como foi gravado.
 */
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import type {
  AnamnesisLimits,
  AnamnesisQuestion,
  AnamnesisQuestionType,
} from "@/lib/domain/anamnesis-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconInfo,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@/components/ui/icons";
import {
  saveAnamnesisModelAction,
  type AnamnesisModelState,
} from "@/app/(app)/config/anamnese/actions";
import { CheckRow } from "./check-row";
import { IconArrowDown, IconArrowUp, IconUndo } from "./icons";

type EditorLimits = Pick<
  AnamnesisLimits,
  "maxQuestions" | "questionText" | "followUp" | "option" | "maxOptions"
>;

/** Pergunta como está sendo editada (opções no texto que ela digita). */
type Draft = {
  id: string;
  text: string;
  type: AnamnesisQuestionType;
  optionsText: string;
  followUp: string;
  required: boolean;
  alert: boolean;
};

const TYPE_OPTIONS: { value: AnamnesisQuestionType; label: string; hint: string }[] = [
  { value: "SIM_NAO", label: "Sim ou não", hint: "A cliente responde sim ou não." },
  {
    value: "TEXTO_CURTO",
    label: "Texto curto",
    hint: "Uma linha de resposta, como o nome de um remédio.",
  },
  { value: "TEXTO_LONGO", label: "Texto longo", hint: "Espaço para a cliente contar com detalhes." },
  {
    value: "ESCOLHA",
    label: "Escolha uma opção",
    hint: "A cliente escolhe uma das opções que você escrever.",
  },
];

const initialState: AnamnesisModelState = { ok: false };

/* ------------------------------------------------------------------ */
/* Rascunho ↔ pergunta (mesmas regras de limpeza do servidor)          */
/* ------------------------------------------------------------------ */

function cleanLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(",")) {
    const option = cleanLine(part);
    const key = option.toLocaleLowerCase("pt-BR");
    if (!option || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

function toDraft(question: AnamnesisQuestion): Draft {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    optionsText: (question.options ?? []).join(", "),
    followUp: question.followUp ?? "",
    required: question.required,
    alert: question.alert,
  };
}

function toQuestion(draft: Draft): AnamnesisQuestion {
  const question: AnamnesisQuestion = {
    id: draft.id,
    text: cleanLine(draft.text),
    type: draft.type,
    required: draft.required,
    alert: draft.type === "SIM_NAO" && draft.alert,
  };
  if (draft.type === "SIM_NAO") {
    const followUp = cleanLine(draft.followUp);
    if (followUp) question.followUp = followUp;
  }
  if (draft.type === "ESCOLHA") question.options = parseOptions(draft.optionsText);
  return question;
}

/** O que seria enviado — também serve para saber se há alteração não salva. */
function serializeDrafts(drafts: readonly Draft[]): string {
  return JSON.stringify(drafts.map(toQuestion));
}

function newQuestionId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    if (!taken.has(id)) return id;
  }
}

function validateDraft(draft: Draft, limits: EditorLimits): string | null {
  const text = cleanLine(draft.text);
  if (!text) return "Escreva a pergunta.";
  if (text.length > limits.questionText) {
    return `A pergunta passou de ${limits.questionText} caracteres.`;
  }
  if (draft.type === "SIM_NAO" && cleanLine(draft.followUp).length > limits.followUp) {
    return `O "se sim, perguntar" passou de ${limits.followUp} caracteres.`;
  }
  if (draft.type === "ESCOLHA") {
    const options = parseOptions(draft.optionsText);
    if (options.length < 2) return "Escreva pelo menos duas opções, separadas por vírgula.";
    if (options.length > limits.maxOptions) return `Use no máximo ${limits.maxOptions} opções.`;
    if (options.some((option) => option.length > limits.option)) {
      return `Cada opção pode ter até ${limits.option} caracteres.`;
    }
  }
  return null;
}

/** "a, b ou c" */
function listOr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ou ${items[items.length - 1]}`;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

const textFieldId = (id: string) => `pergunta-texto-${id}`;
const cardId = (id: string) => `pergunta-${id}`;

/**
 * Enter não salva o modelo sem querer (envio implícito do formulário) nem
 * quebra linha no texto da pergunta, que é uma linha só.
 */
function ignoreEnter(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (event.key === "Enter") event.preventDefault();
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function AnamnesisModelEditor({
  initialQuestions,
  initialUsingDefault,
  legacyAlertLabels,
  limits,
}: {
  initialQuestions: AnamnesisQuestion[];
  /** O modelo em vigor é o padrão do LashOS (nada gravado). */
  initialUsingDefault: boolean;
  /** Rótulo fixo do alerta das perguntas do modelo antigo, por id. */
  legacyAlertLabels: Record<string, string>;
  limits: EditorLimits;
}) {
  const [state, formAction, pending] = useActionState(saveAnamnesisModelAction, initialState);

  const [drafts, setDrafts] = useState<Draft[]>(() => initialQuestions.map(toDraft));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeDrafts(initialQuestions.map(toDraft)),
  );
  const [usingDefault, setUsingDefault] = useState(initialUsingDefault);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ draft: Draft; index: number } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [flash, setFlash] = useState<{ text: string; at: number } | null>(null);
  /**
   * Depois do próximo render: pergunta nova recebe o foco no texto (abre o
   * teclado para escrever); pergunta com erro só é trazida para a tela.
   */
  const revealRef = useRef<{ id: string; focus: boolean } | null>(null);

  // Resposta do servidor: aplica uma vez por resposta (ajuste durante o render).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setConfirmRestore(false);
    if (state.ok && state.questions) {
      const next = state.questions.map(toDraft);
      setDrafts(next);
      setSavedSnapshot(serializeDrafts(next));
      setUsingDefault(Boolean(state.usingDefault));
      setErrors({});
      setFormError(null);
      setLastDeleted(null);
      setFlash({ text: state.message ?? "Modelo salvo", at: state.savedAt ?? 0 });
    } else if (!state.ok) {
      const questionErrors = state.questionErrors ?? {};
      setErrors(questionErrors);
      setFormError(state.error ?? "Não foi possível salvar. Tente de novo.");
      const ids = Object.keys(questionErrors);
      if (ids.length > 0) setOpenIds((prev) => new Set([...prev, ...ids]));
    }
  }

  const payload = useMemo(() => serializeDrafts(drafts), [drafts]);
  const dirty = payload !== savedSnapshot;
  const alertCount = drafts.filter((d) => d.type === "SIM_NAO" && d.alert).length;
  const atLimit = drafts.length >= limits.maxQuestions;

  // "Salvo" some sozinho.
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // Sair da página com alteração não salva pede confirmação do navegador.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Pergunta nova: foco no texto. Primeira pergunta com erro: rola até o cartão.
  useEffect(() => {
    const reveal = revealRef.current;
    if (!reveal) return;
    const target = document.getElementById(
      reveal.focus ? textFieldId(reveal.id) : cardId(reveal.id),
    );
    if (!target) return;
    revealRef.current = null;
    if (reveal.focus) target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: reveal.focus ? "center" : "start" });
  }, [drafts, openIds]);

  function clearError(id: string) {
    setErrors((prev) => {
      if (!hasOwn(prev, id)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  /** Qualquer edição: some o "salvo", o aviso geral e o desfazer da exclusão anterior. */
  function touch() {
    setFlash(null);
    setFormError(null);
    setLastDeleted(null);
  }

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    clearError(id);
    touch();
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function move(index: number, delta: -1 | 1) {
    setDrafts((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    touch();
  }

  function remove(index: number) {
    const draft = drafts[index];
    if (!draft || drafts.length <= 1) return;
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    clearError(draft.id);
    touch();
    setLastDeleted({ draft, index });
  }

  function undoRemove() {
    if (!lastDeleted) return;
    const { draft, index } = lastDeleted;
    setDrafts((prev) =>
      prev.some((d) => d.id === draft.id)
        ? prev
        : [...prev.slice(0, index), draft, ...prev.slice(index)],
    );
    touch();
  }

  function addQuestion() {
    if (atLimit) return;
    const id = newQuestionId(new Set(drafts.map((d) => d.id)));
    setDrafts((prev) => [
      ...prev,
      { id, text: "", type: "SIM_NAO", optionsText: "", followUp: "", required: true, alert: false },
    ]);
    setOpenIds((prev) => new Set(prev).add(id));
    touch();
    revealRef.current = { id, focus: true };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const found: Record<string, string> = {};
    for (const draft of drafts) {
      const error = validateDraft(draft, limits);
      if (error) found[draft.id] = error;
    }
    const ids = Object.keys(found);
    const general =
      drafts.length === 0
        ? "Deixe pelo menos uma pergunta no modelo."
        : drafts.length > limits.maxQuestions
          ? `O modelo pode ter até ${limits.maxQuestions} perguntas.`
          : ids.length > 0
            ? "Revise as perguntas destacadas."
            : null;
    if (general) {
      event.preventDefault();
      setErrors(found);
      setFormError(general);
      if (ids.length > 0) {
        setOpenIds((prev) => new Set([...prev, ...ids]));
        revealRef.current = { id: ids[0], focus: false };
      }
      return;
    }
    setFormError(null);
    setLastDeleted(null);
  }

  const closeRestore = useCallback(() => setConfirmRestore(false), []);

  function restoreDefault() {
    const formData = new FormData();
    formData.set("intencao", "restaurar");
    startTransition(() => formAction(formData));
  }

  return (
    <>
      <div className="mb-6 flex gap-3 rounded-[18px] bg-surface-sunken px-4 py-3.5">
        <IconInfo width={18} height={18} className="mt-px shrink-0 text-ink-soft" />
        <p className="text-[13.5px] leading-snug text-ink-soft">
          As anamneses já respondidas não mudam: cada uma guarda as perguntas como foram feitas
          no dia.
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit}>
        <input type="hidden" name="intencao" value="salvar" />
        <input type="hidden" name="perguntas" value={payload} />

        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">Perguntas</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">
              {drafts.length} {drafts.length === 1 ? "pergunta" : "perguntas"}
              {alertCount > 0
                ? ` · ${alertCount} ${alertCount === 1 ? "vira alerta" : "viram alerta"}`
                : ""}
            </p>
          </div>
          <Badge tone={usingDefault ? "neutral" : "accent"}>
            {usingDefault ? "Modelo padrão" : "Personalizado"}
          </Badge>
        </div>

        <fieldset disabled={pending} className="min-w-0">
          <legend className="sr-only">Perguntas da anamnese</legend>
          <ol className="space-y-3">
            {drafts.map((draft, index) => (
              <li key={draft.id}>
                <QuestionCard
                  draft={draft}
                  index={index}
                  total={drafts.length}
                  expanded={openIds.has(draft.id)}
                  error={errors[draft.id]}
                  legacyAlertLabel={
                    hasOwn(legacyAlertLabels, draft.id) ? legacyAlertLabels[draft.id] : undefined
                  }
                  limits={limits}
                  onToggle={() => toggle(draft.id)}
                  onChange={(patch) => update(draft.id, patch)}
                  onMove={(delta) => move(index, delta)}
                  onRemove={() => remove(index)}
                />
              </li>
            ))}
          </ol>
        </fieldset>

        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          onClick={addQuestion}
          disabled={pending || atLimit}
        >
          <IconPlus width={18} height={18} /> Adicionar pergunta
        </Button>
        {atLimit ? (
          <p className="mt-2 text-center text-[12.5px] text-ink-soft">
            O modelo chegou ao limite de {limits.maxQuestions} perguntas.
          </p>
        ) : null}

        {!usingDefault || dirty ? (
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRestore(true)}
              disabled={pending}
            >
              <IconRefresh width={16} height={16} /> Restaurar modelo padrão
            </Button>
          </div>
        ) : null}

        {/* Barra fixa de ação: acima da navegação no celular, no pé da tela no PC. */}
        <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-20 mt-7 lg:bottom-6">
          <div className="rounded-[22px] bg-surface p-2.5 shadow-[var(--shadow-pop)] ring-1 ring-line">
            {formError ? (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-2 rounded-[14px] bg-danger-soft px-3 py-2.5 text-[13px] font-medium leading-snug text-danger"
              >
                <IconAlert width={16} height={16} className="mt-px shrink-0" />
                {formError}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="min-w-0 grow pl-1.5 text-[13px] leading-snug" aria-live="polite">
                {pending ? (
                  <span className="text-ink-soft">Salvando…</span>
                ) : flash ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                    <IconCheck width={15} height={15} className="shrink-0" />
                    {flash.text}
                  </span>
                ) : lastDeleted ? (
                  <span className="text-ink-soft">
                    Pergunta excluída.{" "}
                    <button
                      type="button"
                      onClick={undoRemove}
                      className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      <IconUndo width={14} height={14} /> Desfazer
                    </button>
                  </span>
                ) : dirty ? (
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                    Alterações não salvas
                  </span>
                ) : (
                  <span className="text-ink-soft">Tudo salvo</span>
                )}
              </div>
              <Button type="submit" disabled={pending || !dirty} className="shrink-0">
                {pending ? "Salvando…" : "Salvar modelo"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Sheet
        open={confirmRestore}
        onClose={closeRestore}
        title="Restaurar o modelo padrão?"
        description="As perguntas voltam a ser as do LashOS."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeRestore} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={restoreDefault} disabled={pending}>
              {pending ? "Restaurando…" : "Restaurar padrão"}
            </Button>
          </div>
        }
      >
        <p className="text-[14.5px] leading-relaxed text-ink-soft">
          {usingDefault
            ? "As alterações que você ainda não salvou serão descartadas."
            : "Suas perguntas personalizadas serão trocadas pelas do modelo padrão nas próximas anamneses."}{" "}
          As anamneses já respondidas não mudam.
        </p>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão de uma pergunta                                              */
/* ------------------------------------------------------------------ */

function QuestionCard({
  draft,
  index,
  total,
  expanded,
  error,
  legacyAlertLabel,
  limits,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  draft: Draft;
  index: number;
  total: number;
  expanded: boolean;
  error?: string;
  legacyAlertLabel?: string;
  limits: EditorLimits;
  onToggle: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  const text = cleanLine(draft.text);
  const typeInfo = TYPE_OPTIONS.find((t) => t.value === draft.type) ?? TYPE_OPTIONS[0];
  const options = draft.type === "ESCOLHA" ? parseOptions(draft.optionsText) : [];
  const bodyId = `pergunta-${draft.id}-campos`;
  // Depois de uma tentativa de salvar, aponta o campo com problema.
  const textError = error && !text ? "Escreva a pergunta." : undefined;
  const optionsError =
    error && draft.type === "ESCOLHA" && options.length < 2
      ? "Escreva pelo menos duas opções, separadas por vírgula."
      : undefined;

  const alertHint = legacyAlertLabel
    ? `Com “sim”, a cliente ganha um alerta vermelho na agenda e na ficha: “${legacyAlertLabel}”.`
    : "Com “sim”, a cliente ganha um alerta vermelho na agenda e na ficha, com o texto desta pergunta.";

  return (
    <Card id={cardId(draft.id)} className="scroll-mt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full items-start gap-3 rounded-[22px] px-4 py-3.5 text-left sm:px-5"
      >
        <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[12.5px] font-semibold tabular-nums text-ink-soft">
          {index + 1}
        </span>
        <span className="min-w-0 grow">
          <span
            className={cn(
              "line-clamp-3 text-[15px] font-semibold leading-snug",
              text ? "text-ink" : "text-ink-faint",
            )}
          >
            {text || "Nova pergunta"}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge>{typeInfo.label}</Badge>
            <Badge>{draft.required ? "Obrigatória" : "Opcional"}</Badge>
            {draft.type === "SIM_NAO" && draft.alert ? (
              <Badge tone="danger">
                <IconAlert width={12} height={12} /> Alerta
              </Badge>
            ) : null}
          </span>
          {error ? (
            <span className="mt-2 block text-[12.5px] font-medium text-danger">{error}</span>
          ) : null}
        </span>
        <IconChevronDown
          width={18}
          height={18}
          className={cn(
            "mt-1 shrink-0 text-ink-faint transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div id={bodyId} className="space-y-5 border-t border-line px-4 pb-4 pt-4 sm:px-5">
          <Field
            label="Pergunta"
            htmlFor={textFieldId(draft.id)}
            hint="É assim que ela aparece na anamnese da cliente."
            error={textError}
          >
            <Textarea
              id={textFieldId(draft.id)}
              value={draft.text}
              rows={2}
              maxLength={limits.questionText}
              placeholder="Ex.: Usa algum medicamento contínuo?"
              aria-invalid={textError ? true : undefined}
              onChange={(e) => onChange({ text: e.target.value })}
              onKeyDown={ignoreEnter}
            />
          </Field>

          <Field label="Tipo de resposta" htmlFor={`pergunta-tipo-${draft.id}`} hint={typeInfo.hint}>
            <Select
              id={`pergunta-tipo-${draft.id}`}
              value={draft.type}
              onChange={(e) => onChange({ type: e.target.value as AnamnesisQuestionType })}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {draft.type === "SIM_NAO" ? (
            <Field
              label="Se sim, perguntar…"
              htmlFor={`pergunta-sesim-${draft.id}`}
              hint="Aparece quando a resposta é sim, para a cliente contar mais. Deixe em branco se não precisar."
            >
              <Input
                id={`pergunta-sesim-${draft.id}`}
                value={draft.followUp}
                maxLength={limits.followUp}
                placeholder="Ex.: Qual?"
                onChange={(e) => onChange({ followUp: e.target.value })}
                onKeyDown={ignoreEnter}
              />
            </Field>
          ) : null}

          {draft.type === "ESCOLHA" ? (
            <Field
              label="Opções"
              htmlFor={`pergunta-opcoes-${draft.id}`}
              hint={
                options.length >= 2
                  ? `A cliente escolhe uma: ${listOr(options)}.`
                  : "Separe as opções por vírgula. A cliente escolhe uma."
              }
              error={optionsError}
            >
              <Input
                id={`pergunta-opcoes-${draft.id}`}
                value={draft.optionsText}
                maxLength={limits.maxOptions * (limits.option + 2)}
                placeholder="Ex.: Fortes, Médios, Frágeis"
                aria-invalid={optionsError ? true : undefined}
                onChange={(e) => onChange({ optionsText: e.target.value })}
                onKeyDown={ignoreEnter}
              />
            </Field>
          ) : null}

          <div className="space-y-2">
            <CheckRow
              checked={draft.required}
              onChange={(required) => onChange({ required })}
              label="Obrigatória"
              hint="A anamnese só pode ser salva com esta pergunta respondida."
            />
            {draft.type === "SIM_NAO" ? (
              <CheckRow
                tone="danger"
                checked={draft.alert}
                onChange={(alert) => onChange({ alert })}
                label="Vira alerta de contraindicação"
                hint={alertHint}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onMove(-1)}
              disabled={index === 0}
            >
              <IconArrowUp width={15} height={15} /> Subir
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
            >
              <IconArrowDown width={15} height={15} /> Descer
            </Button>
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              className="ml-auto"
              onClick={onRemove}
              disabled={total <= 1}
              title={total <= 1 ? "O modelo precisa de pelo menos uma pergunta." : undefined}
            >
              <IconTrash width={15} height={15} /> Excluir
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
