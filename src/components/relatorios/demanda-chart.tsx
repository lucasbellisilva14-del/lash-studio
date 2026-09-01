import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconClock } from "@/components/ui/icons";
import { WEEKDAYS_PT_SHORT } from "@/lib/constants";
import { MiniBarRow } from "@/components/relatorios/bar-row";
import { InsightBox } from "@/components/relatorios/insight";
import type { DemandaData } from "@/app/(app)/relatorios/data";

/** Distribuição de agendamentos por dia da semana e faixa de horário local. */
export function DemandaChart({ demanda }: { demanda: DemandaData }) {
  if (demanda.total === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconClock />}
          title="Nenhum agendamento no período"
          description="Quando a agenda movimentar, seus dias e horários campeões aparecem aqui."
        />
      </Card>
    );
  }

  const maxDia = Math.max(...demanda.porDia);
  const diaCampeao = maxDia > 0 ? demanda.porDia.indexOf(maxDia) : -1;
  const maxFaixa = Math.max(...demanda.porFaixa.map((f) => f.count));
  const faixaCampea =
    maxFaixa > 0 ? demanda.porFaixa.findIndex((f) => f.count === maxFaixa) : -1;

  return (
    <Card>
      <CardBody>
        <p className="text-[13px] font-medium text-ink">Por dia da semana</p>
        <div className="mt-2.5 space-y-2">
          {demanda.porDia.map((count, wd) => (
            <MiniBarRow
              key={wd}
              label={WEEKDAYS_PT_SHORT[wd]}
              count={count}
              max={maxDia}
              destaque={wd === diaCampeao}
            />
          ))}
        </div>

        <p className="mt-5 text-[13px] font-medium text-ink">Por horário</p>
        <div className="mt-2.5 space-y-2">
          {demanda.porFaixa.map((f, i) => (
            <MiniBarRow
              key={f.label}
              label={f.label}
              count={f.count}
              max={maxFaixa}
              destaque={i === faixaCampea}
            />
          ))}
        </div>

        {demanda.campeao ? (
          <div className="mt-4">
            <InsightBox>{demanda.campeao}.</InsightBox>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
