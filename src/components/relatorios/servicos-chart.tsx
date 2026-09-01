import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconScissors } from "@/components/ui/icons";
import { formatBRL } from "@/lib/money";
import { BarRow } from "@/components/relatorios/bar-row";
import type { ServicoItem } from "@/app/(app)/relatorios/data";

/** Serviços mais vendidos no período — barra proporcional pela receita. */
export function ServicosChart({ items }: { items: ServicoItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconScissors />}
          title="Nenhum atendimento no período"
          description="Conclua atendimentos para descobrir seus serviços campeões."
        />
      </Card>
    );
  }

  // Barra pela receita; se ainda não houver receita registrada, pela quantidade.
  const temReceita = items.some((i) => i.netCents > 0);
  const max = Math.max(...items.map((i) => (temReceita ? i.netCents : i.count)), 1);

  return (
    <Card>
      <CardBody className="space-y-4">
        {items.map((item) => (
          <BarRow
            key={item.serviceId}
            label={item.name}
            value={formatBRL(item.netCents)}
            sub={item.count === 1 ? "1 atendimento concluído" : `${item.count} atendimentos concluídos`}
            pct={Math.max(((temReceita ? item.netCents : item.count) / max) * 100, 3)}
          />
        ))}
      </CardBody>
    </Card>
  );
}
