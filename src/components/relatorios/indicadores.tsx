/**
 * Indicadores por profissional (Retorno, Faltas, Cancelamentos, Ocupação):
 * os textos de cada cartão e as duas apresentações — cartões do app e caixas
 * do fechamento impresso. As contas estão em app/(app)/relatorios/indicadores.
 */
import { cn } from "@/lib/cn";
import { plural } from "@/components/financeiro/format";
import type { Indicadores } from "@/app/(app)/relatorios/indicadores";

export type IndicadorItem = {
  key: "retorno" | "faltas" | "cancelamentos" | "ocupacao";
  label: string;
  /** Rótulo para colunas estreitas (lista da equipe no celular). */
  labelCurto: string;
  /** "68%" ou "—" quando falta base. */
  value: string;
  /** "17 de 25 clientes", ou a frase curta de quando falta base. */
  detail: string;
  /** Uma linha explicando a conta. */
  hint: string;
};

/** Fração → "68%"; sem base → "—". */
export function porcentagem(pct: number | null): string {
  return pct == null ? "—" : `${Math.round(pct * 100)}%`;
}

/** Minutos → "7,5h" / "48h". */
export function horas(minutos: number): string {
  const h = minutos / 60;
  return `${h.toLocaleString("pt-BR", { maximumFractionDigits: h < 10 ? 1 : 0 })}h`;
}

export function itensDosIndicadores(
  ind: Indicadores,
  opts: {
    /** De quem se fala: uma profissional ("ela") ou a dona ("você"). */
    quem: "ela" | "voce";
    /** "período" (30/90/365 dias até hoje) ou "mês" (fechamento). */
    recorte: "período" | "mês";
    /** A janela já terminou (mês fechado): retorno conta quem voltou depois. */
    encerrado?: boolean;
  },
): IndicadorItem[] {
  const comQuem = opts.quem === "ela" ? "com ela" : "com você";
  const agenda = opts.quem === "ela" ? "na agenda dela" : "na sua agenda";
  const noRecorte = `no ${opts.recorte}`;
  const { retorno, faltas, cancelamentos, ocupacao } = ind;

  return [
    {
      key: "retorno",
      label: "Retorno",
      labelCurto: "Retorno",
      value: porcentagem(retorno.pct),
      detail:
        retorno.pct == null
          ? `Nenhuma cliente atendida ${noRecorte}`
          : `${retorno.voltaram} de ${plural(retorno.clientes, "cliente", "clientes")}`,
      hint: opts.encerrado
        ? `Voltaram ${comQuem} ${noRecorte} ou depois, ou já têm horário marcado`
        : `Voltaram ${comQuem} ${noRecorte} ou já têm horário marcado`,
    },
    {
      key: "faltas",
      label: "Faltas",
      labelCurto: "Faltas",
      value: porcentagem(faltas.pct),
      detail:
        faltas.pct == null
          ? `Nenhum atendimento ${noRecorte}`
          : `${faltas.faltas} de ${plural(faltas.base, "horário", "horários")}`,
      hint: "Faltas ÷ (concluídos + faltas)",
    },
    {
      key: "cancelamentos",
      label: "Cancelamentos",
      labelCurto: "Cancelados",
      value: porcentagem(cancelamentos.pct),
      detail:
        cancelamentos.pct == null
          ? `Nenhum agendamento ${noRecorte}`
          : `${cancelamentos.cancelados} de ${plural(cancelamentos.total, "agendamento", "agendamentos")}`,
      hint: "Cancelamentos, no prazo ou tardios, ÷ todos os agendamentos",
    },
    {
      key: "ocupacao",
      label: "Ocupação",
      labelCurto: "Ocupação",
      value: porcentagem(ocupacao.pct),
      detail:
        ocupacao.pct == null
          ? "Nenhum horário aberto até agora"
          : `${horas(ocupacao.atendidoMin)} de ${horas(ocupacao.disponivelMin)}`,
      hint: opts.encerrado
        ? `Horas atendidas ÷ horas abertas ${agenda} (funcionamento − bloqueios)`
        : `Horas atendidas ÷ horas abertas ${agenda} (funcionamento − bloqueios), até agora`,
    },
  ];
}

/** Os 4 cartões no app: 2 colunas no celular, 4 quando o conteúdo é largo. */
export function IndicadoresCards({ itens }: { itens: IndicadorItem[] }) {
  return (
    <div className="@container">
      <dl className="grid grid-cols-2 gap-3 @xl:grid-cols-4 @xl:gap-4">
        {itens.map((item) => (
          <div
            key={item.key}
            className="flex min-w-0 flex-col rounded-[22px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] sm:p-5"
          >
            <dt className="text-[13px] font-semibold leading-snug text-ink">{item.label}</dt>
            <dd
              className={cn(
                "mt-2 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums",
                item.value === "—" ? "text-ink-faint" : "text-ink",
              )}
            >
              {item.value}
            </dd>
            <dd className="mt-2 text-[13px] font-medium leading-snug tabular-nums text-ink">{item.detail}</dd>
            <dd className="mt-1 text-[12px] leading-snug text-ink-soft">{item.hint}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Os 4 indicadores no fechamento impresso (mesmo tom das caixas do documento). */
export function IndicadoresDoc({ itens }: { itens: IndicadorItem[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
      {itens.map((item) => (
        <div
          key={item.key}
          className="min-w-0 rounded-xl bg-surface-sunken/60 p-3.5 break-inside-avoid print:border print:border-line"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{item.label}</dt>
          <dd className="font-display text-xl font-bold tracking-[-0.03em] text-ink mt-0.5 tabular-nums">
            {item.value}
          </dd>
          <dd className="mt-1 text-xs font-medium tabular-nums text-ink">{item.detail}</dd>
          <dd className="mt-1 text-[11px] leading-snug text-ink-soft">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
