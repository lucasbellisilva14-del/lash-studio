import { Card } from "@/components/ui/card";
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
    <Card className="p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[13px] font-semibold text-ink">Faturamento líquido</p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
            {formatBRL(netCents)}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">Já descontadas as taxas</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Atendimentos</p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
            {doneCount}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">Concluídos no mês</p>
        </div>
      </div>

      {goal && pct != null ? (
        <div className="mt-5 border-t border-line pt-4 lg:hidden">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">Meta do mês</p>
            <p className="text-[13px] font-semibold tabular-nums text-ink">{pct}%</p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={Math.min(pct, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da meta do mês"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] tabular-nums text-ink-soft">
            {formatBRL(netCents)} de {formatBRL(goal.targetCents)}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
