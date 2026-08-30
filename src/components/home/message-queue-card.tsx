import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconChevronRight, IconWhatsApp } from "@/components/ui/icons";

export type QueuePreviewItem = {
  key: string;
  clientName: string;
  kindLabel: string;
};

/** Fila de mensagens do dia: contagem + primeiros itens + CTA para /mensagens. */
export function MessageQueueCard({
  total,
  items,
}: {
  total: number;
  items: QueuePreviewItem[];
}) {
  if (total === 0) {
    return (
      <Card className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
            <IconCheck />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-[15px] text-ink">Mensagens em dia ✓</p>
            <p className="text-[13px] text-ink-soft">Nenhum envio pendente por agora.</p>
          </div>
        </div>
      </Card>
    );
  }

  const remaining = total - items.length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
          <IconWhatsApp />
        </span>
        <p className="grow font-medium text-[15px] text-ink">
          {total === 1 ? "1 mensagem para enviar" : `${total} mensagens para enviar`}
        </p>
      </div>
      <ul className="px-4 pb-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 min-w-0">
            <span className="text-sm text-ink truncate">{item.clientName}</span>
            <Badge tone="neutral">{item.kindLabel}</Badge>
          </li>
        ))}
        {remaining > 0 ? (
          <li className="text-[13px] text-ink-faint">
            + {remaining} {remaining === 1 ? "outra" : "outras"}
          </li>
        ) : null}
      </ul>
      <Link
        href="/mensagens"
        className="flex items-center justify-center gap-1 border-t border-line px-4 py-3 text-sm font-medium text-accent-strong hover:bg-background transition-colors"
      >
        Abrir fila
        <IconChevronRight width={16} height={16} />
      </Link>
    </Card>
  );
}
