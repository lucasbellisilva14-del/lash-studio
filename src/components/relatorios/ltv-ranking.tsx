import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTrendingUp } from "@/components/relatorios/icons";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { LtvItem } from "@/app/(app)/relatorios/data";

/** Top 10 clientes por receita líquida (todo o histórico), com barra proporcional. */
export function LtvRanking({ items }: { items: LtvItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconTrendingUp />}
          title="Nenhuma receita registrada"
          description="Conclua atendimentos e registre pagamentos para ver suas melhores clientes."
        />
      </Card>
    );
  }

  const max = Math.max(...items.map((i) => i.netCents));

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((item, i) => (
        <Link
          key={item.clientId}
          href={`/clientes/${item.clientId}`}
          className="block px-4 py-3 transition-colors hover:bg-surface-sunken/60"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "w-6 shrink-0 text-center font-display text-lg font-semibold",
                i === 0 ? "text-accent-strong" : "text-ink-faint",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {formatBRL(item.netCents)}
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max((item.netCents / max) * 100, 3)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {item.doneCount === 1
                  ? "1 atendimento concluído"
                  : `${item.doneCount} atendimentos concluídos`}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </Card>
  );
}
