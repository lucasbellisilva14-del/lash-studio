import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";

/**
 * "Meu mês" da funcionária: o que entrou dos atendimentos dela, quantos
 * concluiu e a comissão (líquido × % congelado em cada agendamento).
 * Nada do estúdio aparece aqui.
 */
export function MyMonth({
  receivedCents,
  doneCount,
  commissionCents,
  monthLabel,
}: {
  receivedCents: number;
  doneCount: number;
  commissionCents: number;
  /** "outubro" */
  monthLabel: string;
}) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[13px] font-semibold text-ink">Recebido</p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
            {formatBRL(receivedCents)}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">Dos seus atendimentos, já sem taxas</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">Atendimentos</p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
            {doneCount}
          </p>
          <p className="mt-2 text-[12px] text-ink-soft">Concluídos em {monthLabel}</p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">Sua comissão</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">Sobre o valor líquido recebido</p>
        </div>
        <p className="shrink-0 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-ink">
          {formatBRL(commissionCents)}
        </p>
      </div>
    </Card>
  );
}
