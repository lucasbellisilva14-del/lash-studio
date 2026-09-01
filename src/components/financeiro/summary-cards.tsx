import { Card, CardBody } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Números do painel do mês (já agregados no servidor). */
export type ResumoMes = {
  brutoCents: number;
  liquidoCents: number;
  despesasCents: number;
  lucroCents: number;
  /** null quando não houve atendimento concluído. */
  ticketMedioCents: number | null;
  atendimentos: number;
  /** null quando não houve atendimento no mês. */
  comparecimentoPct: number | null;
  /** null quando nenhuma cliente foi atendida no mês. */
  retornoPct: number | null;
};

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardBody className="p-3.5">
        <p className="text-xs text-ink-soft">{label}</p>
        <p className="mt-0.5 truncate font-display text-lg font-semibold text-ink">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">{hint}</p>
      </CardBody>
    </Card>
  );
}

/** Painel do mês: lucro em destaque + indicadores em grade. */
export function SummaryCards({ resumo }: { resumo: ResumoMes }) {
  const lucroPositivo = resumo.lucroCents >= 0;

  return (
    <div className="space-y-3">
      <Card>
        <CardBody>
          <p className="text-[13px] text-ink-soft">Lucro do mês</p>
          <p
            className={cn(
              "mt-1 font-display text-[28px] font-semibold leading-9",
              lucroPositivo ? "text-success" : "text-danger",
            )}
          >
            {lucroPositivo ? "" : "− "}
            {formatBRL(Math.abs(resumo.lucroCents))}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            faturamento líquido menos despesas
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
            <div>
              <p className="text-[11px] text-ink-faint">Bruto</p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink">
                {formatBRL(resumo.brutoCents)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-faint">Líquido</p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink">
                {formatBRL(resumo.liquidoCents)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-faint">Despesas</p>
              <p className="mt-0.5 text-[13px] font-semibold text-danger">
                − {formatBRL(resumo.despesasCents)}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Ticket médio"
          value={
            resumo.ticketMedioCents != null ? formatBRL(resumo.ticketMedioCents) : "—"
          }
          hint="por atendimento concluído"
        />
        <Stat
          label="Atendimentos"
          value={String(resumo.atendimentos)}
          hint="concluídos no mês"
        />
        <Stat
          label="Comparecimento"
          value={resumo.comparecimentoPct != null ? `${resumo.comparecimentoPct}%` : "—"}
          hint="presenças × faltas e cancelamentos"
        />
        <Stat
          label="Retorno"
          value={resumo.retornoPct != null ? `${resumo.retornoPct}%` : "—"}
          hint="clientes do mês que já eram da casa"
        />
      </div>
    </div>
  );
}
