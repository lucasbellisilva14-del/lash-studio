import { Card, CardBody } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";

/** Resumo do mês: faturamento líquido, atendimentos concluídos e meta (se houver). */
export function MonthSummary({
  netCents,
  doneCount,
  goal,
}: {
  netCents: number;
  doneCount: number;
  goal: { targetCents: number } | null;
}) {
  const pct = goal && goal.targetCents > 0 ? Math.round((netCents / goal.targetCents) * 100) : null;

  return (
    <Card>
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[13px] text-ink-soft">Faturamento líquido</p>
            <p className="font-display text-[22px] leading-7 font-semibold text-ink mt-1">
              {formatBRL(netCents)}
            </p>
          </div>
          <div className="border-l border-line pl-4">
            <p className="text-[13px] text-ink-soft">Atendimentos</p>
            <p className="font-display text-[22px] leading-7 font-semibold text-ink mt-1">
              {doneCount}
            </p>
          </div>
        </div>

        {goal && pct != null ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-medium text-ink">Meta do mês</p>
              <p className="text-[13px] text-ink-soft">{pct}%</p>
            </div>
            <div
              className="mt-1.5 h-2 rounded-full bg-surface-sunken overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.min(pct, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso da meta do mês"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-[13px] text-ink-soft mt-1.5">
              {formatBRL(netCents)} de {formatBRL(goal.targetCents)}
            </p>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
