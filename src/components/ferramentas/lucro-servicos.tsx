"use client";

/**
 * Lucro de cada serviço ativo. Celular: um cartão compacto por serviço.
 * Coluna larga (PC): tabela com cabeçalhos pequenos. O material vem da
 * estimativa do Estoque e pode ser ajustado serviço a serviço.
 */
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { CampoDinheiro } from "./campos";
import {
  SELOS,
  brl,
  calcularServico,
  centavosParaCampo,
  formatarDuracao,
  formatarPct,
  parseDinheiro,
  type ContaServico,
} from "./calculos";
import type { ServicoBasico } from "./types";

type Linha = ContaServico & {
  servico: ServicoBasico;
  /** Texto do campo de material (ajuste dela ou a estimativa). */
  campoMaterial: string;
  ajustado: boolean;
};

function margemTexto(margem: number | null): string {
  return margem === null ? "—" : formatarPct(margem * 100, 0);
}

export function LucroServicos({
  servicos,
  custoHoraCents,
  materialPadraoCents,
  materiais,
  onMaterial,
  taxaPct,
}: {
  servicos: ServicoBasico[];
  custoHoraCents: number;
  /** Estimativa do Estoque, igual para todo atendimento. */
  materialPadraoCents: number;
  /** Ajustes dela por serviço (texto do campo). */
  materiais: Record<string, string>;
  /** null volta para a estimativa. */
  onMaterial: (servicoId: string, valor: string | null) => void;
  /** null = não descontar a taxa do cartão. */
  taxaPct: number | null;
}) {
  const linhas: Linha[] = servicos.map((servico) => {
    const ajuste = materiais[servico.id];
    const materialCents = ajuste === undefined ? materialPadraoCents : parseDinheiro(ajuste);
    return {
      ...calcularServico({
        precoCents: servico.priceCents,
        duracaoMin: servico.durationMin,
        custoHoraCents,
        materialCents,
        taxaPct: taxaPct ?? 0,
      }),
      servico,
      campoMaterial: ajuste ?? centavosParaCampo(materialPadraoCents),
      ajustado: ajuste !== undefined,
    };
  });
  const comTaxa = taxaPct !== null;

  const voltarParaEstimativa = (linha: Linha) =>
    linha.ajustado ? (
      <button
        type="button"
        onClick={() => onMaterial(linha.servico.id, null)}
        className="mt-1 ml-auto block whitespace-nowrap text-[12px] font-medium text-ink-soft underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink hover:decoration-ink"
      >
        Voltar para {brl(materialPadraoCents)}
      </button>
    ) : null;

  return (
    <>
      {/* Celular e coluna estreita: cartões */}
      <ul className="mt-3 space-y-3 @xl:hidden">
        {linhas.map((linha) => {
          const selo = SELOS[linha.selo];
          const idMaterial = `material-cartao-${linha.servico.id}`;
          return (
            <li key={linha.servico.id}>
              <Card>
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {linha.servico.name}
                    </p>
                    <p className="mt-0.5 text-[13px] tabular-nums text-ink-soft">
                      {brl(linha.servico.priceCents)} · {formatarDuracao(linha.servico.durationMin)}
                    </p>
                  </div>
                  <Badge tone={selo.tom} className="shrink-0">
                    {selo.rotulo}
                  </Badge>
                </div>

                <dl className="mt-3 space-y-2 px-4 text-[14px]">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-soft">Custo do tempo</dt>
                    <dd className="tabular-nums text-ink">{brl(linha.tempoCents)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="pt-3">
                      <label htmlFor={idMaterial} className="text-ink-soft">
                        Material
                      </label>
                    </dt>
                    <dd className="text-right">
                      <CampoDinheiro
                        id={idMaterial}
                        className="w-32"
                        inputClassName="text-right"
                        value={linha.campoMaterial}
                        onChange={(e) => onMaterial(linha.servico.id, e.target.value)}
                      />
                      {voltarParaEstimativa(linha)}
                    </dd>
                  </div>
                  {comTaxa ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink-soft">
                        Taxa do cartão ({formatarPct(taxaPct ?? 0)})
                      </dt>
                      <dd className="tabular-nums text-ink">{brl(linha.taxaCents)}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line px-4 py-3">
                  <span className="text-[14px] font-semibold text-ink">Lucro</span>
                  <span className="tabular-nums">
                    <span
                      className={cn(
                        "text-[16px] font-bold tracking-[-0.01em]",
                        linha.lucroCents < 0 ? "text-danger" : "text-ink",
                      )}
                    >
                      {brl(linha.lucroCents)}
                    </span>
                    <span className="text-[13px] text-ink-soft">
                      {" "}
                      · margem {margemTexto(linha.margem)}
                    </span>
                  </span>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Coluna larga: tabela */}
      <Card className="mt-3 hidden overflow-hidden @xl:block">
        <table className="w-full border-collapse text-[14px]">
          <caption className="sr-only">Lucro por serviço</caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted text-[12px] text-ink-soft">
              <th scope="col" className="py-2.5 pl-4 pr-2 text-left font-semibold sm:pl-5">
                Serviço
              </th>
              <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                Tempo
              </th>
              <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                Material
              </th>
              {comTaxa ? (
                <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                  Taxa
                </th>
              ) : null}
              <th scope="col" className="py-2.5 pl-2 pr-4 text-right font-semibold sm:pr-5">
                Lucro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((linha) => {
              const selo = SELOS[linha.selo];
              return (
                <tr key={linha.servico.id} className="align-middle">
                  <td className="py-3 pl-4 pr-2 sm:pl-5">
                    <p className="font-semibold text-ink">{linha.servico.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="whitespace-nowrap text-[12.5px] tabular-nums text-ink-soft">
                        {brl(linha.servico.priceCents)} · {formatarDuracao(linha.servico.durationMin)}
                      </span>
                      <Badge tone={selo.tom}>{selo.rotulo}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-ink">
                    {brl(linha.tempoCents)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <CampoDinheiro
                      aria-label={`Material de ${linha.servico.name}`}
                      className="ml-auto w-[6.75rem]"
                      inputClassName="text-right"
                      value={linha.campoMaterial}
                      onChange={(e) => onMaterial(linha.servico.id, e.target.value)}
                    />
                    {voltarParaEstimativa(linha)}
                  </td>
                  {comTaxa ? (
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-ink">
                      {brl(linha.taxaCents)}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right sm:pr-5">
                    <p
                      className={cn(
                        "font-bold tabular-nums",
                        linha.lucroCents < 0 ? "text-danger" : "text-ink",
                      )}
                    >
                      {brl(linha.lucroCents)}
                    </p>
                    <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-soft">
                      margem {margemTexto(linha.margem)}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-soft">
        Tempo = duração × sua hora ({brl(custoHoraCents)}). Lucro = preço − tempo − material
        {comTaxa ? " − taxa do cartão" : ""}; a margem é quanto do preço sobra. Saudável: sobra
        20% ou mais. Margem baixa: menos de 20%. Abaixo do custo: o preço não paga os custos.
      </p>
    </>
  );
}
