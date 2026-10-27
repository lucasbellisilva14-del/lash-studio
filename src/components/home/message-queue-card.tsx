import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconCheckCircle } from "@/components/ui/icons";

export type QueuePreviewItem = {
  key: string;
  clientName: string;
  kindLabel: string;
};

/** Fila de mensagens do dia: contagem + primeiros itens (o atalho fica no título da seção). */
export function MessageQueueCard({
  total,
  items,
}: {
  total: number;
  items: QueuePreviewItem[];
}) {
  if (total === 0) {
    return (
      <Card className="flex items-center gap-3.5 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <IconCheckCircle width={19} height={19} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">Mensagens em dia</p>
          <p className="text-[13px] text-ink-soft">Nenhum envio pendente por agora.</p>
        </div>
      </Card>
    );
  }

  const remaining = total - items.length;

  return (
    <Card className="overflow-hidden">
      <p className="px-5 pt-4 pb-1 text-[15px] font-semibold text-ink">
        {total === 1 ? "1 mensagem para mandar" : `${total} mensagens para mandar`}
      </p>
      <ul className="px-5 pb-3">
        {items.map((item) => (
          <li key={item.key} className="flex min-w-0 items-center justify-between gap-3 py-2">
            <span className="truncate text-[14px] text-ink">{item.clientName}</span>
            <Badge tone="neutral">{item.kindLabel}</Badge>
          </li>
        ))}
        {remaining > 0 ? (
          <li className="pb-1 text-[13px] text-ink-soft">
            + {remaining} {remaining === 1 ? "outra" : "outras"}
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
