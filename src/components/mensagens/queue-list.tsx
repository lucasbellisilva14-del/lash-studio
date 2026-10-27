"use client";

/**
 * Fila do dia em abas (Tudo, uma por tipo e Feitas hoje), com envio otimista.
 * "Enviar" abre o wa.me (link) e registra o MessageLog em paralelo;
 * "Descartar" só registra (status DESCARTADA). Os dois tiram o item da lista
 * na hora, e o que foi enviado já aparece em "Feitas hoje".
 */
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconTaskDone,
  IconWhatsApp,
} from "@/components/ui/icons";
import { IconSend } from "@/components/mensagens/icons";
import { ProChip, type ProView } from "@/components/home/pro-avatar";
import { cn } from "@/lib/cn";
import type { TemplateKind } from "@/lib/constants";
import {
  descartarMensagem,
  marcarEnviada,
  type ActionResult,
} from "@/app/(app)/mensagens/actions";

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
  /** Linha de contexto pronta (ex.: "Amanhã às 14:00 · Volume brasileiro"). */
  meta: string | null;
  /** Com equipe, na visão da dona: aviso de outra profissional ("com Ana"). */
  pro?: ProView | null;
};

/** Mensagem que saiu hoje (aba "Feitas hoje"). */
export type DoneListItem = {
  key: string;
  clientId: string;
  clientName: string;
  /** Kind do MessageLog: tipos da fila ou LIVRE (avulsa). */
  kind: string;
  kindLabel: string;
  body: string;
  /** "14:32" no fuso da profissional ("agora" no envio otimista). */
  timeLabel: string;
  /** ISO da âncora — casa o envio otimista com o registro do servidor. */
  refDate: string | null;
};

type TypeTab =
  | "CONFIRMACOES"
  | "LEMBRETES"
  | "POS"
  | "MANUTENCAO"
  | "RETORNO"
  | "RESGATE"
  | "ANIVERSARIOS"
  | "REMARCAR";
type TabKey = "TUDO" | TypeTab | "FEITAS";

/** Em que aba mora cada tipo da fila (tipo novo sem aba não compila). */
const KIND_TAB: Record<TemplateKind, TypeTab> = {
  CONFIRMACAO: "CONFIRMACOES",
  LEMBRETE_24H: "LEMBRETES",
  POS_APLICACAO: "POS",
  MANUTENCAO: "MANUTENCAO",
  RETORNO: "RETORNO",
  RESGATE_45: "RESGATE",
  RESGATE_60: "RESGATE",
  RESGATE_90: "RESGATE",
  ANIVERSARIO: "ANIVERSARIOS",
  REMARCAR: "REMARCAR",
};

/** Abas de tipo, na ordem da tela (e da lista "Tudo"). */
const TYPE_TABS: ReadonlyArray<{ key: TypeTab; label: string }> = [
  { key: "CONFIRMACOES", label: "Confirmações" },
  { key: "LEMBRETES", label: "Lembretes" },
  { key: "POS", label: "Pós-aplicação" },
  { key: "MANUTENCAO", label: "Manutenção" },
  { key: "RETORNO", label: "Retorno" },
  { key: "RESGATE", label: "Resgate" },
  { key: "ANIVERSARIOS", label: "Aniversários" },
  { key: "REMARCAR", label: "Remarcar" },
];
const TAB_ORDER = new Map<TypeTab, number>(TYPE_TABS.map((tab, index) => [tab.key, index]));

function tabIndex(kind: TemplateKind): number {
  return TAB_ORDER.get(KIND_TAB[kind]) ?? TYPE_TABS.length;
}

/** Casa um envio otimista com o MessageLog que o servidor devolveu. */
function doneMatchKey(item: { kind: string; clientId: string; refDate: string | null }) {
  return `${item.kind}|${item.clientId}|${item.refDate ?? ""}`;
}

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

const FALHA_REGISTRO = "Não foi possível registrar a mensagem. Tente de novo.";

export function QueueList({
  items,
  done,
}: {
  items: QueueListItem[];
  done: DoneListItem[];
}) {
  const [tab, setTab] = useState<TabKey>("TUDO");
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(new Set());
  const [sentLocal, setSentLocal] = useState<DoneListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Pendentes na ordem das abas; dentro do tipo, a ordem que a fila montou.
  const pending = useMemo(
    () =>
      items
        .filter((item) => !hiddenKeys.has(item.key))
        .sort((a, b) => tabIndex(a.kind) - tabIndex(b.kind)),
    [items, hiddenKeys],
  );

  // Feitas hoje = servidor + envios otimistas que o servidor ainda não devolveu.
  const doneAll = useMemo(() => {
    const fromServer = new Set(done.map(doneMatchKey));
    return [...sentLocal.filter((item) => !fromServer.has(doneMatchKey(item))), ...done];
  }, [done, sentLocal]);

  const countByTab = new Map<TypeTab, number>();
  for (const item of pending) {
    const key = KIND_TAB[item.kind];
    countByTab.set(key, (countByTab.get(key) ?? 0) + 1);
  }

  // Abas de tipo vazias somem (a ativa fica até ela trocar); Tudo e Feitas hoje ficam sempre.
  const tabItems: TabItem[] = [
    { key: "TUDO", label: "Tudo", count: pending.length },
    ...TYPE_TABS.filter((t) => (countByTab.get(t.key) ?? 0) > 0 || t.key === tab).map((t) => ({
      key: t.key,
      label: t.label,
      count: countByTab.get(t.key) ?? 0,
    })),
    { key: "FEITAS", label: "Feitas hoje", count: doneAll.length },
  ];

  const hide = (key: string) => setHiddenKeys((prev) => new Set(prev).add(key));
  const unhide = (key: string) =>
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  const register = (
    item: QueueListItem,
    action: (input: unknown) => Promise<ActionResult>,
    rollback: () => void,
  ) => {
    startTransition(async () => {
      try {
        const result = await action(toActionInput(item));
        if (!result.ok) {
          rollback();
          setError(result.error);
        }
      } catch {
        rollback();
        setError(FALHA_REGISTRO);
      }
    });
  };

  const send = (item: QueueListItem) => {
    setError(null);
    hide(item.key);
    const localKey = `local:${item.key}`;
    setSentLocal((prev) => [
      {
        key: localKey,
        clientId: item.clientId,
        clientName: item.clientName,
        kind: item.kind,
        kindLabel: item.kindLabel,
        body: item.body,
        timeLabel: "agora",
        refDate: item.refDate,
      },
      ...prev,
    ]);
    register(item, marcarEnviada, () => {
      unhide(item.key);
      setSentLocal((prev) => prev.filter((done) => done.key !== localKey));
    });
  };

  const discard = (item: QueueListItem) => {
    setError(null);
    hide(item.key);
    register(item, descartarMensagem, () => unhide(item.key));
  };

  let content: ReactNode;
  if (tab === "FEITAS") {
    content =
      doneAll.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconWhatsApp />}
            title="Nenhuma mensagem enviada hoje."
            description="O que você mandar pela Fila aparece aqui, com a hora do envio."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {doneAll.map((item) => (
              <DoneRow key={item.key} item={item} />
            ))}
          </ul>
        </Card>
      );
  } else {
    const list = tab === "TUDO" ? pending : pending.filter((item) => KIND_TAB[item.kind] === tab);
    if (list.length === 0) {
      content =
        tab === "TUDO" ? (
          <Card>
            <EmptyState
              icon={<IconTaskDone />}
              title={doneAll.length > 0 ? "Fila zerada por hoje." : "Nada para mandar agora."}
              description={
                doneAll.length > 0
                  ? `Você já mandou ${doneAll.length === 1 ? "1 mensagem" : `${doneAll.length} mensagens`} hoje. Se alguém precisar de outra, ela aparece aqui.`
                  : "Confirmações, lembretes e avisos de retorno aparecem aqui quando chegar a hora."
              }
            />
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<IconTaskDone />}
              title="Nada para mandar aqui."
              description="Ninguém nesta lista precisa de mensagem agora. Confira as outras abas."
            />
          </Card>
        );
    } else {
      const showKind = tab === "TUDO" || tab === "RESGATE";
      content = (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {list.map((item) => (
              <QueueRow
                key={item.key}
                item={item}
                showKind={showKind}
                onSend={() => send(item)}
                onDiscard={() => discard(item)}
              />
            ))}
          </ul>
        </Card>
      );
    }
  }

  return (
    <div className="space-y-4">
      <Tabs
        items={tabItems}
        value={tab}
        onChange={(key) => setTab(key as TabKey)}
        ariaLabel="Tipos de mensagem"
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13.5px] leading-snug text-danger"
        >
          <IconAlert width={18} height={18} className="mt-px shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {content}
    </div>
  );
}

function QueueRow({
  item,
  showKind,
  onSend,
  onDiscard,
}: {
  item: QueueListItem;
  showKind: boolean;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const sendClasses = buttonClasses("primary", "md", "flex-1 sm:flex-none sm:min-w-36");

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{item.clientName}</p>
          {item.meta ? (
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{item.meta}</p>
          ) : null}
        </div>
        {showKind || item.pro ? (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {showKind ? <Badge>{item.kindLabel}</Badge> : null}
            {item.pro ? <ProChip pro={item.pro} /> : null}
          </div>
        ) : null}
      </div>

      <MessagePreview body={item.body} className="mt-3" />

      <div className="mt-3 flex items-center gap-2">
        {item.waUrl ? (
          <a
            href={item.waUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onSend}
            className={sendClasses}
          >
            <IconWhatsApp width={18} height={18} />
            Enviar
          </a>
        ) : (
          <button type="button" onClick={onSend} className={sendClasses}>
            <IconSend width={17} height={17} />
            Enviar
          </button>
        )}
        <Button variant="ghost" onClick={onDiscard}>
          Descartar
        </Button>
      </div>
    </li>
  );
}

function DoneRow({ item }: { item: DoneListItem }) {
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{item.clientName}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{item.kindLabel}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold tabular-nums text-ink-soft">
          <IconCheck width={15} height={15} className="text-success" />
          {item.timeLabel}
        </span>
      </div>
      <MessagePreview body={item.body} className="mt-3" />
    </li>
  );
}

/** Prévia da mensagem: duas linhas, toque para ver inteira. */
function MessagePreview({ body, className }: { body: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > 110 || body.split("\n").length > 2;
  const textClass = "whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft";

  if (!long) {
    return (
      <div className={cn("rounded-[16px] bg-surface-sunken px-3.5 py-3", className)}>
        <p className={textClass}>{body}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      className={cn(
        "block w-full rounded-[16px] bg-surface-sunken px-3.5 py-3 text-left",
        className,
      )}
    >
      <p className={cn(textClass, !expanded && "line-clamp-2")}>{body}</p>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink">
        {expanded ? "Ver menos" : "Ver mensagem inteira"}
        <IconChevronDown
          width={14}
          height={14}
          className={cn("transition-transform duration-150", expanded && "rotate-180")}
        />
      </span>
    </button>
  );
}
