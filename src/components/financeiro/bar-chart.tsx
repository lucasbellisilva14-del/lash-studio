"use client";

/**
 * "Entradas x saídas" dos últimos 6 meses — colunas em CSS, sem biblioteca.
 * Entradas (líquidas) em verde e saídas em vermelho suave, sempre nessa ordem
 * dentro do mês; o par passou no validador de daltonismo (ΔE 12). Passar o
 * mouse, tocar ou focar um mês mostra os valores dele na linha de leitura; a
 * tabela "Ver valores" deixa todos os números acessíveis sem interação.
 */
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChart } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { formatSignedBRL } from "./format";
import type { ChartMonth, ChartTick } from "./types";

const COR_ENTRADAS = "bg-success";
const COR_SAIDAS = "bg-danger/60";

function altura(cents: number, topo: number): string | undefined {
  if (cents <= 0 || topo <= 0) return undefined;
  return `max(2px, ${(cents / topo) * 100}%)`;
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px]", className)} />;
}

export function BarChart({
  title,
  description,
  months,
  ticks,
  topCents,
  focusKey,
  series,
  emptyText,
}: {
  title: string;
  description: string;
  months: ChartMonth[];
  /** Linhas de grade, de 0 até o topo. */
  ticks: ChartTick[];
  topCents: number;
  /** Mês em foco (o que a tela mostra). */
  focusKey: string;
  /** "fluxo" = entradas x saídas; "entradas" = só o recebido (uma profissional). */
  series: "fluxo" | "entradas";
  emptyText: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState(focusKey);
  const fluxo = series === "fluxo";
  const ativoKey = hover ?? escolhido;
  const ativo = months.find((m) => m.key === ativoKey) ?? months[months.length - 1];
  const destacando = hover !== null || escolhido !== focusKey;
  const vazio = months.every((m) => m.entradasCents === 0 && m.saidasCents === 0);

  return (
    <Card className="@container min-w-0">
      <CardHeader title={title} description={description} />
      {vazio ? (
        <EmptyState icon={<IconChart />} title="Sem movimento ainda" description={emptyText} />
      ) : (
        <CardBody>
          {/* Leitura do mês ativo: também é a legenda (cor + nome + valor). */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
            <p className="text-[13px] font-semibold text-ink">{ativo.longLabel}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                {fluxo ? <Swatch className={COR_ENTRADAS} /> : null}
                {fluxo ? "Entradas" : "Recebido"}
                <span className="font-semibold tabular-nums text-ink">{formatBRL(ativo.entradasCents)}</span>
              </span>
              {fluxo ? (
                <span className="flex items-center gap-1.5">
                  <Swatch className={COR_SAIDAS} />
                  Saídas
                  <span className="font-semibold tabular-nums text-ink">{formatBRL(ativo.saidasCents)}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {/* Eixo: valores redondos e compactos */}
            <div aria-hidden className="relative h-40 w-[3.75rem] shrink-0">
              {ticks.map((t) => (
                <span
                  key={t.cents}
                  className="absolute right-0 translate-y-1/2 whitespace-nowrap text-[11px] leading-none tabular-nums text-ink-faint"
                  style={{ bottom: `${topCents > 0 ? (t.cents / topCents) * 100 : 0}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            <div className="relative h-40 min-w-0 grow">
              {ticks.map((t) => (
                <div
                  key={t.cents}
                  aria-hidden
                  className="absolute inset-x-0 h-px bg-line"
                  style={{ bottom: `${topCents > 0 ? (t.cents / topCents) * 100 : 0}%` }}
                />
              ))}
              <div
                className="absolute inset-0 flex items-end"
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setHover(null);
                }}
              >
                {months.map((m) => {
                  const ehAtivo = m.key === ativoKey;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-label={
                        fluxo
                          ? `${m.longLabel}: entradas ${formatBRL(m.entradasCents)}, saídas ${formatBRL(m.saidasCents)}`
                          : `${m.longLabel}: recebido ${formatBRL(m.entradasCents)}`
                      }
                      aria-pressed={ehAtivo}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") setHover(m.key);
                      }}
                      onFocus={() => setEscolhido(m.key)}
                      onClick={() => setEscolhido(m.key)}
                      className={cn(
                        "flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-[8px] outline-none transition-opacity duration-150",
                        "focus-visible:ring-2 focus-visible:ring-accent/45",
                        destacando && !ehAtivo && "opacity-45",
                      )}
                    >
                      <span
                        className={cn("w-[30%] rounded-t-[4px]", fluxo ? "max-w-[18px]" : "max-w-[22px]", COR_ENTRADAS)}
                        style={{ height: altura(m.entradasCents, topCents) }}
                      />
                      {fluxo ? (
                        <span
                          className={cn("w-[30%] max-w-[18px] rounded-t-[4px]", COR_SAIDAS)}
                          style={{ height: altura(m.saidasCents, topCents) }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Meses (alinhados às colunas) */}
          <div aria-hidden className="mt-2 flex gap-2">
            <div className="w-[3.75rem] shrink-0" />
            <div className="flex min-w-0 grow">
              {months.map((m) => (
                <span
                  key={m.key}
                  className={cn(
                    "flex-1 text-center text-[11.5px]",
                    m.key === ativoKey ? "font-semibold text-ink" : "text-ink-faint",
                  )}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <details className="group mt-4 border-t border-line pt-3">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Ver valores mês a mês</span>
              <span className="hidden group-open:inline">Esconder valores</span>
            </summary>
            <table className="mt-2.5 w-full text-[13px] tabular-nums">
              <caption className="sr-only">{title}: valores por mês</caption>
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  <th scope="col" className="py-1.5 font-semibold">Mês</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">{fluxo ? "Entradas" : "Recebido"}</th>
                  {fluxo ? (
                    <>
                      <th scope="col" className="py-1.5 text-right font-semibold">Saídas</th>
                      <th scope="col" className="hidden py-1.5 text-right font-semibold @sm:table-cell">Saldo</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {months.map((m) => {
                  const saldo = m.entradasCents - m.saidasCents;
                  return (
                    <tr key={m.key}>
                      <th scope="row" className="py-2 pr-2 text-left font-medium text-ink">
                        {m.longLabel}
                      </th>
                      <td className="py-2 text-right text-ink">{formatBRL(m.entradasCents)}</td>
                      {fluxo ? (
                        <>
                          <td className="py-2 pl-2 text-right text-ink">{formatBRL(m.saidasCents)}</td>
                          <td
                            className={cn(
                              "hidden py-2 pl-2 text-right @sm:table-cell",
                              saldo < 0 ? "text-danger" : "text-ink",
                            )}
                          >
                            {formatSignedBRL(saldo)}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </CardBody>
      )}
    </Card>
  );
}
