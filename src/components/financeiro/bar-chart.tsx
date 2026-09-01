import { Card, CardBody } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";

export type ChartMonth = {
  key: string;
  /** Ex.: "ago" */
  label: string;
  receitaCents: number;
  despesaCents: number;
};

function Bar({ cents, max, className }: { cents: number; max: number; className: string }) {
  if (cents <= 0) {
    return <div className="w-3 rounded-full bg-surface-sunken" style={{ height: 3 }} />;
  }
  const pct = Math.max(4, Math.round((cents / max) * 100));
  return <div className={`w-3 rounded-t-full ${className}`} style={{ height: `${pct}%` }} />;
}

/** Barras (CSS puro) de receita líquida × despesas dos últimos 6 meses. */
export function BarChart({ months }: { months: ChartMonth[] }) {
  const max = Math.max(
    1,
    ...months.map((m) => Math.max(m.receitaCents, m.despesaCents)),
  );
  const melhor = months.reduce(
    (acc, m) => Math.max(acc, m.receitaCents),
    0,
  );

  return (
    <Card>
      <CardBody>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Últimos 6 meses</h2>
          {melhor > 0 ? (
            <p className="text-xs text-ink-faint">melhor mês: {formatBRL(melhor)}</p>
          ) : null}
        </div>

        <div className="mt-4 flex items-stretch justify-between gap-1">
          {months.map((m) => (
            <div key={m.key} className="flex min-w-0 grow flex-col items-center gap-1.5">
              <div className="flex h-24 w-full items-end justify-center gap-1">
                <Bar cents={m.receitaCents} max={max} className="bg-accent" />
                <Bar cents={m.despesaCents} max={max} className="bg-ink-faint/70" />
              </div>
              <p className="text-[11px] text-ink-faint">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-4 border-t border-line pt-3">
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Receita líquida
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-ink-faint/70" />
            Despesas
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
