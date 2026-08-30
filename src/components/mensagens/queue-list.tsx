"use client";

/**
 * Fila do dia: resumo por tipo + lista agrupada com envio otimista.
 * "Enviar" abre o wa.me (link) e registra o MessageLog em paralelo;
 * "Descartar" só registra (status DESCARTADA). Ambos somem da lista na hora.
 */
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronDown, IconWhatsApp, IconX } from "@/components/ui/icons";
import { IconSend, IconSparkles } from "@/components/mensagens/icons";
import { cn } from "@/lib/cn";
import type { TemplateKind } from "@/lib/constants";
import { descartarMensagem, marcarEnviada } from "@/app/(app)/mensagens/actions";

export type QueueListItem = {
  key: string;
  kind: TemplateKind;
  kindLabel: string;
  clientId: string;
  clientName: string;
  appointmentId: string | null;
  templateId: string;
  body: string;
  waUrl: string | null;
  /** ISO string (âncora de dedupe). */
  refDate: string;
  /** Linha de contexto pronta (ex.: "Atendimento em 05/09/2026 às 14:00"). */
  meta: string | null;
};

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const KIND_TONES: Record<TemplateKind, BadgeTone> = {
  CONFIRMACAO: "accent",
  LEMBRETE_24H: "warning",
  POS_APLICACAO: "success",
  MANUTENCAO: "warning",
  ANIVERSARIO: "accent",
  RESGATE_45: "danger",
  RESGATE_60: "danger",
  RESGATE_90: "danger",
};

const GROUPS: Array<{ title: string; kinds: TemplateKind[] }> = [
  { title: "Confirmação", kinds: ["CONFIRMACAO"] },
  { title: "Lembrete 24h", kinds: ["LEMBRETE_24H"] },
  { title: "Pós-aplicação", kinds: ["POS_APLICACAO"] },
  { title: "Manutenção", kinds: ["MANUTENCAO"] },
  { title: "Aniversário", kinds: ["ANIVERSARIO"] },
  { title: "Resgates", kinds: ["RESGATE_45", "RESGATE_60", "RESGATE_90"] },
];

function toActionInput(item: QueueListItem) {
  return {
    kind: item.kind,
    clientId: item.clientId,
    appointmentId: item.appointmentId,
    templateId: item.templateId,
    body: item.body,
    refDate: item.refDate,
  };
}

export function QueueList({ items }: { items: QueueListItem[] }) {
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(
    () => items.filter((item) => !hiddenKeys.has(item.key)),
    [items, hiddenKeys],
  );

  const hide = (key: string) =>
    setHiddenKeys((prev) => new Set(prev).add(key));
  const unhide = (key: string) =>
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const run = (
    item: QueueListItem,
    action: (input: unknown) => Promise<{ ok: true } | { ok: false; error: string }>,
  ) => {
    setError(null);
    hide(item.key);
    startTransition(async () => {
      try {
        const result = await action(toActionInput(item));
        if (!result.ok) {
          unhide(item.key);
          setError(result.error);
        }
      } catch {
        unhide(item.key);
        setError("Não foi possível registrar a mensagem. Tente de novo.");
      }
    });
  };

  if (visible.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconSparkles />}
          title="Tudo em dia!"
          description="Nenhuma mensagem pendente hoje."
        />
      </Card>
    );
  }

  const countByKind = new Map<TemplateKind, number>();
  for (const item of visible) {
    countByKind.set(item.kind, (countByKind.get(item.kind) ?? 0) + 1);
  }

  return (
    <div className="space-y-5">
      {/* Resumo do dia */}
      <Card className="p-4">
        <p className="font-display text-lg font-semibold text-ink">
          {visible.length === 1
            ? "1 mensagem para enviar"
            : `${visible.length} mensagens para enviar`}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {GROUPS.flatMap((group) => group.kinds)
            .filter((kind) => (countByKind.get(kind) ?? 0) > 0)
            .map((kind) => {
              const item = visible.find((i) => i.kind === kind);
              return (
                <Badge key={kind} tone={KIND_TONES[kind]}>
                  {item?.kindLabel} · {countByKind.get(kind)}
                </Badge>
              );
            })}
        </div>
      </Card>

      {error ? (
        <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      ) : null}

      {/* Grupos na ordem canônica */}
      {GROUPS.map((group) => {
        const groupItems = visible.filter((item) => group.kinds.includes(item.kind));
        if (groupItems.length === 0) return null;
        return (
          <section key={group.title}>
            <h2 className="mb-2 flex items-baseline gap-1.5 px-0.5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
              {group.title}
              <span className="font-normal">· {groupItems.length}</span>
            </h2>
            <div className="space-y-2.5">
              {groupItems.map((item) => (
                <QueueCard
                  key={item.key}
                  item={item}
                  onSend={() => run(item, marcarEnviada)}
                  onDiscard={() => run(item, descartarMensagem)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function QueueCard({
  item,
  onSend,
  onDiscard,
}: {
  item: QueueListItem;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const sendClasses =
    "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 " +
    "text-sm font-medium text-accent-ink shadow-sm transition-colors select-none " +
    "hover:bg-accent-strong active:bg-accent-strong";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{item.clientName}</p>
          {item.meta ? (
            <p className="mt-0.5 text-xs text-ink-faint">{item.meta}</p>
          ) : null}
        </div>
        <Badge tone={KIND_TONES[item.kind]}>{item.kindLabel}</Badge>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-2.5 w-full rounded-xl bg-surface-sunken px-3.5 py-2.5 text-left transition-colors hover:bg-background"
      >
        <p
          className={cn(
            "text-sm leading-relaxed text-ink-soft whitespace-pre-wrap",
            !expanded && "line-clamp-2",
          )}
        >
          {item.body}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent">
          {expanded ? "Ver menos" : "Ver mensagem completa"}
          <IconChevronDown
            width={14}
            height={14}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </span>
      </button>

      <div className="mt-3 flex items-center gap-2">
        {item.waUrl ? (
          <a
            href={item.waUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onSend}
            className={sendClasses}
          >
            <IconWhatsApp width={17} height={17} />
            Enviar
          </a>
        ) : (
          <button type="button" onClick={onSend} className={sendClasses}>
            <IconSend width={16} height={16} />
            Enviar
          </button>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink-soft transition-colors select-none hover:bg-surface-sunken active:bg-surface-sunken"
        >
          <IconX width={15} height={15} />
          Descartar
        </button>
      </div>
    </Card>
  );
}
