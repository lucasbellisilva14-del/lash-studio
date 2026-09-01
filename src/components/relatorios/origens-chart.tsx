import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChat } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import { BarRow } from "@/components/relatorios/bar-row";
import { InsightBox } from "@/components/relatorios/insight";
import type { OrigemItem } from "@/app/(app)/relatorios/data";

/** Distribuição das clientes por origem + receita líquida associada a cada canal. */
export function OrigensChart({
  origens,
  insight,
}: {
  origens: OrigemItem[];
  insight: string | null;
}) {
  if (origens.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconChat />}
          title="Nenhuma cliente cadastrada"
          description="Cadastre clientes informando como elas conheceram o estúdio."
        />
      </Card>
    );
  }

  const max = Math.max(...origens.map((o) => o.count));

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {origens.map((o) => (
            <BarRow
              key={o.key}
              label={o.label}
              value={`${o.count} · ${o.pct}%`}
              sub={
                o.netCents > 0
                  ? `${formatBRL(o.netCents)} em receitas`
                  : "Sem receita registrada"
              }
              pct={Math.max((o.count / max) * 100, 3)}
            />
          ))}
        </div>
        {insight ? (
          <div className="mt-4">
            <InsightBox>{insight}</InsightBox>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
