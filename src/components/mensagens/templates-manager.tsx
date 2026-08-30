"use client";

/**
 * Gestão dos 8 templates: lista com toggle ativo + edição em Sheet
 * (nome, corpo, chips de variáveis que inserem no cursor e prévia ao vivo).
 */
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { TemplateKind } from "@/lib/constants";
import { renderTemplate, TEMPLATE_VARIABLES } from "@/lib/domain/templates";
import {
  alternarTemplate,
  salvarTemplate,
  type SalvarTemplateState,
} from "@/app/(app)/mensagens/templates/actions";

export type TemplateRow = {
  kind: TemplateKind;
  kindLabel: string;
  name: string;
  body: string;
  active: boolean;
  exists: boolean;
};

export type TemplateExample = {
  studioName: string;
  addressLine: string | null;
  mapsUrl: string | null;
  pixKey: string | null;
  timezone: string;
  /** Amanhã às 14:00 no fuso da profissional (ISO). */
  sampleStartAtIso: string;
};

const initialState: SalvarTemplateState = { ok: false, error: null, savedAt: 0 };

export function TemplatesManager({
  templates,
  example,
}: {
  templates: TemplateRow[];
  example: TemplateExample;
}) {
  const [editingKind, setEditingKind] = useState<TemplateKind | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<TemplateKind, boolean>>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isActive = (row: TemplateRow) => overrides[row.kind] ?? row.active;

  const handleToggle = (row: TemplateRow) => {
    const next = !isActive(row);
    setToggleError(null);
    setOverrides((prev) => ({ ...prev, [row.kind]: next }));
    startTransition(async () => {
      try {
        const result = await alternarTemplate({ kind: row.kind, active: next });
        if (!result.ok) {
          setOverrides((prev) => ({ ...prev, [row.kind]: !next }));
          setToggleError(result.error);
        }
      } catch {
        setOverrides((prev) => ({ ...prev, [row.kind]: !next }));
        setToggleError("Não foi possível atualizar. Tente de novo.");
      }
    });
  };

  const editing = templates.find((t) => t.kind === editingKind) ?? null;

  return (
    <>
      {toggleError ? (
        <p className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {toggleError}
        </p>
      ) : null}

      <Card className="divide-y divide-line">
        {templates.map((row) => (
          <div key={row.kind} className="flex items-center gap-3 px-4 py-3.5">
            <button
              type="button"
              onClick={() => setEditingKind(row.kind)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{row.name}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {row.kindLabel}
                  {!row.exists ? " · não configurado" : null}
                </span>
              </span>
              <IconChevronRight
                width={16}
                height={16}
                className="ml-auto shrink-0 text-ink-faint"
              />
            </button>
            <ToggleSwitch
              checked={isActive(row)}
              onToggle={() => handleToggle(row)}
              label={`Ativar ${row.name}`}
            />
          </div>
        ))}
      </Card>

      {editing ? (
        <TemplateEditSheet
          key={editing.kind}
          template={{ ...editing, active: isActive(editing) }}
          example={example}
          onClose={() => setEditingKind(null)}
        />
      ) : null}
    </>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function TemplateEditSheet({
  template,
  example,
  onClose,
}: {
  template: TemplateRow;
  example: TemplateExample;
  onClose: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [body, setBody] = useState(template.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, pending] = useActionState(salvarTemplate, initialState);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    if (state.ok && state.savedAt > 0 && state.savedAt !== lastSavedRef.current) {
      lastSavedRef.current = state.savedAt;
      onClose();
    }
  }, [state, onClose]);

  const insertVariable = (variable: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => prev + variable);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? start;
    setBody(body.slice(0, start) + variable + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = renderTemplate(body, {
    clientName: "Juliana",
    startAt: new Date(example.sampleStartAtIso),
    serviceName: "Volume brasileiro",
    priceCents: 18000,
    depositCents: 5400,
    addressLine: example.addressLine ?? "Rua das Acácias, 123 — Centro",
    mapsUrl: example.mapsUrl,
    pixKey: example.pixKey ?? "chave-pix@exemplo.com.br",
    studioName: example.studioName,
    timezone: example.timezone,
  });

  return (
    <Sheet open onClose={onClose} title={template.kindLabel} tall>
      <form action={formAction} className="space-y-4 pt-1">
        <input type="hidden" name="kind" value={template.kind} />
        <input type="hidden" name="active" value={template.active ? "1" : "0"} />

        <Field label="Nome" htmlFor="template-name">
          <Input
            id="template-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Confirmação de agendamento"
            maxLength={80}
          />
        </Field>

        <div>
          <Label htmlFor="template-body">Mensagem</Label>
          <textarea
            id="template-body"
            name="body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva a mensagem e use as variáveis abaixo..."
            maxLength={2000}
            className={cn(
              "min-h-44 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5",
              "text-[15px] leading-relaxed text-ink placeholder:text-ink-faint",
              "outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/15",
            )}
          />
          <p className="mt-1 text-xs text-ink-faint">
            Toque numa variável para inserir onde o cursor estiver:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.variable}
                type="button"
                title={v.description}
                onClick={() => insertVariable(v.variable)}
                className="inline-flex h-7 items-center rounded-full bg-accent-soft px-2.5 font-mono text-xs font-medium text-accent-strong transition-colors hover:bg-accent hover:text-accent-ink"
              >
                {v.variable}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Pré-visualização</Label>
          <div className="rounded-2xl rounded-tl-md bg-accent-soft px-3.5 py-3">
            {preview.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {preview}
              </p>
            ) : (
              <p className="text-sm italic text-ink-faint">
                A prévia aparece aqui conforme você escreve.
              </p>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Exemplo com a cliente Juliana, amanhã às 14:00, Volume brasileiro (R$ 180,00).
          </p>
        </div>

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando..." : "Salvar template"}
        </Button>
      </form>
    </Sheet>
  );
}
