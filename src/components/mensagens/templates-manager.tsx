"use client";

/**
 * Modelos de mensagem da Fila: lista por grupo com liga/desliga e edição em
 * Sheet (nome, texto, variáveis que entram no cursor e prévia ao vivo).
 */
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Label, inputBase } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { IconAlert, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { TemplateKind } from "@/lib/constants";
import {
  renderTemplate,
  TEMPLATE_VARIABLES,
  type TemplateContext,
} from "@/lib/domain/templates";
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
  /** Link público de agendamento ({{link_agendamento}}). */
  bookingUrl: string;
};

/** Quando cada modelo entra na Fila (na lista e no topo do editor). */
const KIND_WHEN: Record<TemplateKind, string> = {
  CONFIRMACAO: "Sai quando um horário é marcado.",
  LEMBRETE_24H: "Sai na véspera do atendimento.",
  POS_APLICACAO: "Sai no dia da aplicação ou do lash lifting e no dia seguinte.",
  MANUTENCAO:
    "Sai a partir do dia do aviso de manutenção (Políticas), se ela não tiver horário marcado.",
  RETORNO:
    "Sai no retorno ideal do serviço (lifting, brow, design), se ela não tiver horário marcado.",
  REMARCAR: "Sai quando ela falta ou cancela e ainda não marcou outro horário.",
  ANIVERSARIO: "Sai no dia do aniversário da cliente.",
  RESGATE_45: "Sai quando ela passa 45 dias sem voltar para os cílios.",
  RESGATE_60: "Sai quando ela passa 60 dias sem voltar para os cílios.",
  RESGATE_90: "Sai quando ela passa 90 dias sem voltar para os cílios.",
};

const GROUPS: ReadonlyArray<{ title: string; kinds: TemplateKind[] }> = [
  { title: "Atendimento", kinds: ["CONFIRMACAO", "LEMBRETE_24H", "POS_APLICACAO"] },
  { title: "Relacionamento", kinds: ["MANUTENCAO", "RETORNO", "REMARCAR", "ANIVERSARIO"] },
  { title: "Resgate", kinds: ["RESGATE_45", "RESGATE_60", "RESGATE_90"] },
];

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

  // Grupos na ordem da tela; tipo sem grupo cai em "Outros".
  const grouped = new Set(GROUPS.flatMap((g) => g.kinds));
  const sections = [
    ...GROUPS.map((group) => ({
      title: group.title,
      rows: group.kinds.flatMap((kind) => templates.filter((t) => t.kind === kind)),
    })),
    { title: "Outros", rows: templates.filter((t) => !grouped.has(t.kind)) },
  ].filter((section) => section.rows.length > 0);

  return (
    <div className="space-y-6">
      {toggleError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13.5px] leading-snug text-danger"
        >
          <IconAlert width={18} height={18} className="mt-px shrink-0" />
          <p>{toggleError}</p>
        </div>
      ) : null}

      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-2.5 px-1 text-[15px] font-bold tracking-[-0.015em] text-ink">
            {section.title}
          </h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {section.rows.map((row) => (
                <li key={row.kind} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <button
                    type="button"
                    onClick={() => setEditingKind(row.kind)}
                    className="flex min-w-0 grow items-center gap-3 text-left"
                  >
                    <span className="min-w-0 grow">
                      <span
                        className={cn(
                          "block truncate text-[15px] font-semibold",
                          isActive(row) ? "text-ink" : "text-ink-soft",
                        )}
                      >
                        {row.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                        {row.exists ? KIND_WHEN[row.kind] : "Ainda sem texto. Toque para escrever."}
                      </span>
                    </span>
                    <IconChevronRight
                      width={18}
                      height={18}
                      className="shrink-0 text-ink-faint"
                    />
                  </button>
                  <ToggleSwitch
                    checked={isActive(row)}
                    onToggle={() => handleToggle(row)}
                    label={`${isActive(row) ? "Desligar" : "Ligar"} ${row.name}`}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}

      {editing ? (
        <TemplateEditSheet
          key={editing.kind}
          template={{ ...editing, active: isActive(editing) }}
          example={example}
          onClose={() => setEditingKind(null)}
        />
      ) : null}
    </div>
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
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150",
        checked ? "bg-accent" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform duration-150",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/** Dados de exemplo da prévia, por tipo (retorno e remarcar contam outra história). */
function sampleFor(
  kind: TemplateKind,
  example: TemplateExample,
): { ctx: TemplateContext; caption: string } {
  const base: TemplateContext = {
    clientName: "Juliana",
    addressLine: example.addressLine ?? "Rua das Acácias, 123 — Centro",
    mapsUrl: example.mapsUrl,
    pixKey: example.pixKey ?? "chave-pix@exemplo.com.br",
    studioName: example.studioName,
    timezone: example.timezone,
    bookingUrl: example.bookingUrl,
  };
  const tomorrow = new Date(example.sampleStartAtIso);

  if (kind === "RETORNO") {
    return {
      ctx: { ...base, serviceName: "Brow lamination", priceCents: 12000 },
      caption: "Exemplo com a cliente Juliana, que fez Brow lamination.",
    };
  }
  if (kind === "REMARCAR") {
    const yesterday = new Date(tomorrow.getTime() - 2 * 24 * 60 * 60 * 1000);
    return {
      ctx: { ...base, serviceName: "Volume brasileiro", startAt: yesterday, priceCents: 18000 },
      caption: "Exemplo com a cliente Juliana, que faltou ontem às 14:00 (Volume brasileiro).",
    };
  }
  return {
    ctx: {
      ...base,
      serviceName: "Volume brasileiro",
      startAt: tomorrow,
      priceCents: 18000,
      depositCents: 5400,
    },
    caption: "Exemplo com a cliente Juliana, amanhã às 14:00, Volume brasileiro (R$ 180,00).",
  };
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

  const sample = sampleFor(template.kind, example);
  const preview = renderTemplate(body, sample.ctx);

  return (
    <Sheet
      open
      onClose={onClose}
      title={template.kindLabel}
      description={KIND_WHEN[template.kind]}
      tall
      footer={
        <div className="space-y-2.5">
          {state.error ? (
            <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger">
              <IconAlert width={16} height={16} className="mt-px shrink-0" />
              {state.error}
            </p>
          ) : null}
          <Button type="submit" form="template-form" size="lg" disabled={pending}>
            {pending ? "Salvando..." : "Salvar modelo"}
          </Button>
        </div>
      }
    >
      <form id="template-form" action={formAction} className="space-y-5">
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
            className={cn(inputBase, "h-auto min-h-44 py-2.5 leading-relaxed")}
          />
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
            Toque numa variável para colocar onde está o cursor.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <Chip
                key={v.variable}
                size="sm"
                title={v.description}
                aria-label={`Inserir ${v.variable}: ${v.description}`}
                onClick={() => insertVariable(v.variable)}
                className="font-mono"
              >
                {v.variable}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Como a cliente recebe</p>
          <div className="rounded-[18px] rounded-tl-[6px] bg-surface-sunken px-4 py-3">
            {preview.trim() ? (
              <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink">
                {preview}
              </p>
            ) : (
              <p className="text-[14px] text-ink-faint">
                A prévia aparece aqui conforme você escreve.
              </p>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{sample.caption}</p>
        </div>
      </form>
    </Sheet>
  );
}
