import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconChevronRight } from "@/components/ui/icons";
import { plural } from "@/components/financeiro/format";
import { ProAvatar } from "@/components/financeiro/pro-avatar";
import type { IndicadorItem } from "@/components/relatorios/indicadores";

export type EquipeLinha = {
  key: string;
  /** "Você" ou o primeiro nome. */
  label: string;
  initials: string;
  color: string;
  /** Desativada: aparece porque teve agendamento no período. */
  inactive: boolean;
  /** Aplica o filtro desta profissional. */
  href: string;
  concluidos: number;
  itens: IndicadorItem[];
};

/** Colunas da tabela larga (nome + concluídos + 4 indicadores + seta). */
const COLUNAS = "grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))_16px] items-center gap-3";

function Linha({ linha }: { linha: EquipeLinha }) {
  const desativada = linha.inactive ? <Badge tone="neutral">Desativada</Badge> : null;
  return (
    <>
      {/* Estreito: nome e concluídos em cima, os 4 indicadores numa faixa embaixo */}
      <div className="px-4 py-3.5 sm:px-5 @2xl:hidden">
        <div className="flex items-center gap-3">
          <ProAvatar initials={linha.initials} color={linha.color} />
          <div className="min-w-0 grow">
            <p className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[14.5px] font-semibold text-ink">{linha.label}</span>
              {desativada}
            </p>
            <p className="text-[12.5px] text-ink-soft">
              {plural(linha.concluidos, "atendimento concluído", "atendimentos concluídos")}
            </p>
          </div>
          <IconChevronRight width={16} height={16} className="shrink-0 text-ink-faint" />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 rounded-[14px] bg-surface-sunken px-3 py-2.5 @min-[20rem]:grid-cols-4">
          {linha.itens.map((item) => (
            <div key={item.key} className="min-w-0" title={item.detail}>
              <dt className="truncate text-[11px] leading-tight text-ink-soft">{item.labelCurto}</dt>
              <dd className="mt-1 text-[14px] font-semibold leading-none tabular-nums text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Largo: uma linha de tabela */}
      <div className={`hidden px-5 py-3 @2xl:grid ${COLUNAS}`}>
        <span className="flex min-w-0 items-center gap-2.5">
          <ProAvatar initials={linha.initials} color={linha.color} size={28} />
          <span className="truncate text-[14px] font-semibold text-ink">{linha.label}</span>
          {desativada}
        </span>
        <span className="text-right text-[13px] font-medium tabular-nums text-ink">{linha.concluidos}</span>
        {linha.itens.map((item) => (
          <span key={item.key} title={item.detail} className="text-right text-[13px] font-semibold tabular-nums text-ink">
            {item.value}
          </span>
        ))}
        <IconChevronRight width={16} height={16} className="text-ink-faint" />
      </div>
    </>
  );
}

/**
 * Seção "Equipe" (só com equipe, em "Estúdio todo"): uma linha por
 * profissional com os indicadores do período; tocar aplica o filtro dela.
 */
export function EquipeIndicadores({ linhas }: { linhas: EquipeLinha[] }) {
  return (
    <>
      <Card className="@container overflow-hidden">
        <div
          aria-hidden
          className={`hidden border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-faint @2xl:grid ${COLUNAS}`}
        >
          <span>Profissional</span>
          <span className="text-right">Concluídos</span>
          <span className="text-right">Retorno</span>
          <span className="text-right">Faltas</span>
          <span className="text-right">Cancelados</span>
          <span className="text-right">Ocupação</span>
          <span />
        </div>
        <ul className="divide-y divide-line">
          {linhas.map((linha) => (
            <li key={linha.key}>
              <Link
                href={linha.href}
                className="block transition-colors hover:bg-surface-muted active:bg-surface-sunken"
              >
                <Linha linha={linha} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-2 px-1 text-[12.5px] leading-snug text-ink-soft">
        Toque numa profissional para ver as contas de cada indicador. “—” = sem dados no período.
      </p>
    </>
  );
}
