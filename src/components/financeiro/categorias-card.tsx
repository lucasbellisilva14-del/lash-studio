import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconWallet } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import type { CategoriaItem } from "./types";

/**
 * "Despesas por categoria" do mês: uma barra por categoria, do maior para o
 * menor, com valor e fatia do total. A barra mede a fatia (% do total), na
 * mesma cor das saídas do gráfico ao lado.
 */
export function CategoriasCard({
  monthLabel,
  items,
  totalCents,
}: {
  monthLabel: string;
  items: CategoriaItem[];
  totalCents: number;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader title="Despesas por categoria" description={`Para onde foi o dinheiro em ${monthLabel.toLowerCase()}`} />
      {items.length === 0 ? (
        <EmptyState
          icon={<IconWallet />}
          title="Nenhuma despesa no período."
          description="Lance aluguel, material e o que mais sair no botão Despesa, no topo."
        />
      ) : (
        <CardBody>
          <ul className="space-y-3.5">
            {items.map((item) => (
              <li key={item.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[14px] font-medium text-ink">{item.label}</p>
                  <p className="shrink-0 text-[13.5px] tabular-nums text-ink">
                    <span className="font-semibold">{formatBRL(item.cents)}</span>
                    <span className="ml-1.5 inline-block w-9 text-right text-[12.5px] text-ink-soft">
                      {item.pct < 1 ? "<1%" : `${Math.round(item.pct)}%`}
                    </span>
                  </p>
                </div>
                <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-danger/60"
                    style={{ width: `${Math.max(item.pct, 1)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <p className="text-[13px] font-semibold text-ink-soft">Total</p>
            <p className="text-[14px] font-bold tabular-nums text-ink">{formatBRL(totalCents)}</p>
          </div>
        </CardBody>
      )}
    </Card>
  );
}
