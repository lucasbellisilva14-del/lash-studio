/**
 * Previsão de estoque: o que acaba ou vence primeiro, com a data para
 * comprar. Sem interação: desenha no servidor a partir de `carregarEstoque`.
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBox } from "@/components/ui/icons";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { formatWithPattern } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { formatarNumero } from "./calculos";
import type { ProdutoPrevisto } from "./previsao-estoque-calculo";
import type { DadosEstoque } from "./types";

function ddmm(data: Date, tz: string): string {
  return formatWithPattern(data, "dd/MM", tz);
}

/** "Acaba hoje" · "Acaba em 5 dias" · "Vence em 12 dias" · "Já venceu" */
function rotuloLimite(limite: NonNullable<ProdutoPrevisto["limite"]>): string {
  const verbo = limite.motivo === "CONSUMO" ? "Acaba" : "Vence";
  if (limite.dias < 0) return limite.motivo === "CONSUMO" ? "Acabou" : "Já venceu";
  if (limite.dias === 0) return `${verbo} hoje`;
  if (limite.dias === 1) return `${verbo} amanhã`;
  return `${verbo} em ${limite.dias} dias`;
}

function categoria(chave: string): string {
  return (PRODUCT_CATEGORIES as Record<string, string>)[chave] ?? chave;
}

export function PrevisaoEstoque({ dados, tz }: { dados: DadosEstoque; tz: string }) {
  if (dados.comConsumo === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconBox />}
          title="Cadastre o consumo por atendimento no Estoque."
          description="Com o consumo de cada insumo, a previsão diz quando ele acaba e até quando comprar."
          action={
            <Link href="/estoque" className={buttonClasses("primary", "md")}>
              Abrir Estoque
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="@container">
      <p className="mb-3 px-1 text-[13px] leading-snug text-ink-soft">
        {dados.concluidos30d > 0 ? (
          <>
            Ritmo: {formatarNumero(dados.atendimentosPorDiaUtil, 1)}{" "}
            {dados.atendimentosPorDiaUtil === 1 ? "atendimento" : "atendimentos"} por dia útil (
            {dados.concluidos30d} concluídos nos últimos 30 dias).
          </>
        ) : (
          <>
            Nenhum atendimento concluído nos últimos 30 dias: por enquanto só a validade entra
            na previsão.
          </>
        )}
      </p>

      <ul className="space-y-3" aria-live="polite">
        {dados.produtos.map((p) => (
          <li key={p.id}>
            <Card>
              <CardBody className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{p.nome}</p>
                  <p className="mt-0.5 text-[13px] tabular-nums text-ink-soft">
                    {categoria(p.categoria)} · {formatarNumero(p.quantidade, 2)} {p.unidade} ·{" "}
                    {formatarNumero(p.consumo, 2)} {p.unidade} por atendimento
                  </p>
                  <p className="mt-2 text-[14px] text-ink">
                    Dá para{" "}
                    <strong className="font-semibold tabular-nums">
                      {p.atendimentosRestantes}{" "}
                      {p.atendimentosRestantes === 1 ? "atendimento" : "atendimentos"}
                    </strong>
                    {p.acabaEm && p.atendimentosRestantes > 0 ? (
                      <span className="text-ink-soft"> · acaba por volta de {ddmm(p.acabaEm, tz)}</span>
                    ) : null}
                  </p>
                  {p.validade ? (
                    <p className="mt-0.5 text-[13px] tabular-nums text-ink-soft">
                      Validade: {ddmm(p.validade, tz)}
                    </p>
                  ) : null}
                  {p.comprarAte ? (
                    <p
                      className={cn(
                        "mt-1.5 text-[13px] font-semibold tabular-nums",
                        p.tom === "danger"
                          ? "text-danger"
                          : p.tom === "warning"
                            ? "text-warning"
                            : "text-ink",
                      )}
                    >
                      Compre até {ddmm(p.comprarAte, tz)}
                    </p>
                  ) : null}
                </div>
                {p.limite ? (
                  <Badge tone={p.tom ?? "neutral"} className="shrink-0">
                    {rotuloLimite(p.limite)}
                  </Badge>
                ) : (
                  <Badge tone="neutral" className="shrink-0">
                    Sem previsão
                  </Badge>
                )}
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-soft">
        Atendimentos restantes = quantidade ÷ consumo por atendimento. A data considera só os
        seus dias de trabalho. Para colas, vale a validade depois de aberta ou a do rótulo, a
        que vier primeiro. Vermelho: 7 dias ou menos. Amarelo: até 14 dias.
      </p>
    </div>
  );
}
