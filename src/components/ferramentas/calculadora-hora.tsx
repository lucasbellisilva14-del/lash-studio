"use client";

/**
 * Quanto vale a hora dela e o lucro real de cada serviço.
 * Despesas e horas chegam dos dados da conta (editáveis; voltam ao real ao
 * recarregar). Pró-labore, ocupação, material ajustado e taxa do cartão
 * ficam salvos neste aparelho.
 */
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import {
  IconAlert,
  IconCalculator,
  IconChevronDown,
  IconClock,
  IconScissors,
} from "@/components/ui/icons";
import { useGuardado } from "./armazenamento";
import { AcaoNaDica, CampoComUnidade, CampoDinheiro, LinkNaDica } from "./campos";
import {
  OCUPACAO_PADRAO,
  SEMANAS_POR_MES,
  brl,
  calcularHora,
  centavosParaCampo,
  formatarHoras,
  formatarNumero,
  formatarPct,
  listarNomes,
  numeroParaCampo,
  parseDinheiro,
  parseNumero,
  type ResultadoHora,
} from "./calculos";
import { LucroServicos } from "./lucro-servicos";
import type { DadosHora, DespesasDoMes } from "./types";

/** Teto de horas num mês (31 × 24). */
const HORAS_MAX = 744;

const OPCOES_TAXA = [
  { value: "nao", label: "Não descontar" },
  { value: "sim", label: "Descontar" },
] as const;

type Motivo = "HORAS" | "OCUPACAO" | "CUSTOS";

/** Ajustes de material guardados: { [serviceId]: "12,50" }. */
function lerMateriais(guardado: string | null): Record<string, string> {
  if (!guardado) return {};
  try {
    const dados: unknown = JSON.parse(guardado);
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return {};
    const saida: Record<string, string> = {};
    for (const [id, valor] of Object.entries(dados)) {
      if (typeof valor === "string") saida[id] = valor;
    }
    return saida;
  } catch {
    return {};
  }
}

export function CalculadoraHora({ dados }: { dados: DadosHora }) {
  const despesasDoFinanceiro = dados.despesas.totalCents;
  const horasDosHorarios = (dados.horario.minutosSemana / 60) * SEMANAS_POR_MES;
  const campoDespesasReal = despesasDoFinanceiro > 0 ? centavosParaCampo(despesasDoFinanceiro) : "";
  const campoHorasReal = horasDosHorarios > 0 ? numeroParaCampo(horasDosHorarios, 1) : "";

  const [despesas, setDespesas] = useState(campoDespesasReal);
  const [horas, setHoras] = useState(campoHorasReal);
  const [prolaboreGuardado, setProlabore] = useGuardado(`${dados.chave}:prolabore`);
  const [ocupacaoGuardada, setOcupacao] = useGuardado(`${dados.chave}:ocupacao`);
  const [materiaisGuardados, setMateriaisGuardados] = useGuardado(`${dados.chave}:material`);
  const [taxaLigadaGuardada, setTaxaLigada] = useGuardado(`${dados.chave}:taxa-cartao`);
  const [taxaPctGuardada, setTaxaPct] = useGuardado(`${dados.chave}:taxa-cartao-pct`);

  const prolabore = prolaboreGuardado ?? "";
  const ocupacao = ocupacaoGuardada ?? String(OCUPACAO_PADRAO);
  const materiais = useMemo(() => lerMateriais(materiaisGuardados), [materiaisGuardados]);
  const taxaLigada = taxaLigadaGuardada === "1";
  const campoTaxaReal = dados.cartao ? numeroParaCampo(dados.cartao.pct, 2) : "";
  const campoTaxa = taxaPctGuardada ?? campoTaxaReal;

  const despesasCents = parseDinheiro(despesas);
  const prolaboreCents = parseDinheiro(prolabore);
  const horasMes = parseNumero(horas);
  const ocupacaoPct = parseNumero(ocupacao);
  const taxaPct = parseNumero(campoTaxa);

  const horasInvalidas =
    horas.trim() !== "" && (horasMes === null || horasMes <= 0 || horasMes > HORAS_MAX);
  const ocupacaoInvalida =
    ocupacao.trim() !== "" && (ocupacaoPct === null || ocupacaoPct <= 0 || ocupacaoPct > 100);
  const taxaInvalida = taxaLigada && taxaPct !== null && (taxaPct < 0 || taxaPct >= 100);

  let motivo: Motivo | null = null;
  if (horasInvalidas || horasMes === null || horasMes <= 0) motivo = "HORAS";
  else if (ocupacaoInvalida || ocupacaoPct === null) motivo = "OCUPACAO";
  else if (despesasCents + prolaboreCents <= 0) motivo = "CUSTOS";

  const hora =
    motivo === null && horasMes !== null && ocupacaoPct !== null
      ? calcularHora({ despesasCents, prolaboreCents, horasMes, ocupacaoPct })
      : null;

  function definirMaterial(servicoId: string, valor: string | null) {
    const proximo = { ...materiais };
    if (valor === null) delete proximo[servicoId];
    else proximo[servicoId] = valor;
    setMateriaisGuardados(Object.keys(proximo).length > 0 ? JSON.stringify(proximo) : null);
  }

  const real = dados.ocupacaoReal;

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] @3xl:items-start">
        {/* Celular: o resultado vem primeiro (os campos já chegam preenchidos).
            Coluna larga: campos à esquerda, resultado à direita. */}
        <div className="@3xl:order-last">
          <CartaoDaHora
            hora={hora}
            motivo={motivo}
            despesasCents={despesasCents}
            prolaboreCents={prolaboreCents}
            horasMes={horasMes ?? 0}
            ocupacaoPct={ocupacaoPct ?? 0}
          />
        </div>

        <Card>
          <CardHeader
            title="Seus números do mês"
            description="Despesas e horas vêm dos seus dados. Mude à vontade para simular."
          />
          <CardBody className="grid gap-5 @xl:grid-cols-2 @3xl:grid-cols-1">
            <Field
              label="Despesas fixas por mês"
              htmlFor="hora-despesas"
              hint={
                <DicaDespesas
                  despesas={dados.despesas}
                  editado={despesas !== campoDespesasReal}
                  restaurar={() => setDespesas(campoDespesasReal)}
                />
              }
            >
              <CampoDinheiro
                id="hora-despesas"
                value={despesas}
                onChange={(e) => setDespesas(e.target.value)}
                placeholder="0,00"
              />
            </Field>

            <Field
              label="Quanto você quer tirar por mês"
              htmlFor="hora-prolabore"
              hint="Seu pró-labore: o salário que você paga para você. Fica salvo só neste aparelho."
            >
              <CampoDinheiro
                id="hora-prolabore"
                value={prolabore}
                onChange={(e) => setProlabore(e.target.value)}
                placeholder="0,00"
              />
            </Field>

            <Field
              label="Horas de atendimento por mês"
              htmlFor="hora-horas"
              error={horasInvalidas ? "Digite as horas do mês em números (até 744)." : undefined}
              hint={
                <DicaHoras
                  horario={dados.horario}
                  editado={campoHorasReal !== "" && horas !== campoHorasReal}
                  restaurar={() => setHoras(campoHorasReal)}
                />
              }
            >
              <CampoComUnidade
                id="hora-horas"
                unidade="h"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                placeholder="0"
                aria-invalid={horasInvalidas || undefined}
              />
            </Field>

            <Field
              label="Ocupação da agenda"
              htmlFor="hora-ocupacao"
              error={ocupacaoInvalida ? "Use um número de 1 a 100." : undefined}
              hint={
                <>
                  Nem toda hora aberta vira atendimento.
                  {real ? (
                    <>
                      {" "}
                      {real.semanas === 1 ? "Na última semana" : `Nas últimas ${real.semanas} semanas`},
                      seus atendimentos concluídos ocuparam {real.pct}% das horas abertas.
                      {real.pct > 0 && ocupacaoPct !== real.pct ? (
                        <>
                          {" "}
                          <AcaoNaDica onClick={() => setOcupacao(String(real.pct))}>
                            Usar {real.pct}%
                          </AcaoNaDica>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              }
            >
              <CampoComUnidade
                id="hora-ocupacao"
                unidade="%"
                value={ocupacao}
                onChange={(e) => setOcupacao(e.target.value)}
                placeholder={String(OCUPACAO_PADRAO)}
                aria-invalid={ocupacaoInvalida || undefined}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="lucro-titulo" className="mt-8">
        <h2 id="lucro-titulo" className="text-[17px] font-bold tracking-[-0.015em] text-ink">
          Lucro por serviço
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {taxaLigada
            ? "O que sobra de cada serviço depois de pagar o seu tempo, o material e a taxa do cartão."
            : "O que sobra de cada serviço depois de pagar o seu tempo e o material."}
        </p>

        {dados.servicos.length === 0 ? (
          <Card className="mt-3">
            <EmptyState
              icon={<IconScissors />}
              title="Nenhum serviço ativo"
              description="Cadastre seus serviços com preço e duração para ver o lucro de cada um."
              action={
                <Link href="/servicos" className={buttonClasses("primary", "md")}>
                  Cadastrar serviço
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="mt-3">
              <CardBody className="grid gap-5 @xl:grid-cols-2">
                <div>
                  <p id="lucro-taxa" className="text-[13px] font-semibold text-ink">
                    Taxa do cartão
                  </p>
                  <div
                    role="group"
                    aria-labelledby="lucro-taxa"
                    className="mt-1.5 flex flex-wrap items-center gap-2.5"
                  >
                    <Segmented
                      size="sm"
                      options={OPCOES_TAXA}
                      value={taxaLigada ? "sim" : "nao"}
                      onChange={(v) => setTaxaLigada(v === "sim" ? "1" : null)}
                    />
                    {taxaLigada ? (
                      <CampoComUnidade
                        id="lucro-taxa-pct"
                        aria-label="Taxa média do cartão, em %"
                        unidade="%"
                        className="w-28"
                        value={campoTaxa}
                        onChange={(e) => setTaxaPct(e.target.value)}
                        placeholder="0"
                        aria-invalid={taxaInvalida || undefined}
                      />
                    ) : null}
                  </div>
                  <p
                    className={
                      taxaInvalida
                        ? "mt-1.5 text-[12.5px] font-medium text-danger"
                        : "mt-1.5 text-[12.5px] leading-snug text-ink-soft"
                    }
                  >
                    {taxaInvalida ? (
                      "Use uma taxa de 0 a 99%."
                    ) : (
                      <DicaTaxa
                        cartao={dados.cartao}
                        ligada={taxaLigada}
                        editada={taxaPctGuardada !== null && taxaPctGuardada !== campoTaxaReal}
                        restaurar={() => setTaxaPct(null)}
                      />
                    )}
                  </p>
                </div>

                <BlocoMaterial material={dados.material} />
              </CardBody>
            </Card>

            {hora ? (
              <LucroServicos
                servicos={dados.servicos}
                custoHoraCents={hora.custoHoraCents}
                materialPadraoCents={dados.material.porAtendimentoCents}
                materiais={materiais}
                onMaterial={definirMaterial}
                taxaPct={taxaLigada && !taxaInvalida ? (taxaPct ?? 0) : null}
              />
            ) : (
              <p className="mt-3 px-1 text-[13px] text-ink-soft">
                Complete os números do mês acima para ver o lucro de cada serviço.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado em destaque                                               */
/* ------------------------------------------------------------------ */

function CartaoDaHora({
  hora,
  motivo,
  despesasCents,
  prolaboreCents,
  horasMes,
  ocupacaoPct,
}: {
  hora: ResultadoHora | null;
  motivo: Motivo | null;
  despesasCents: number;
  prolaboreCents: number;
  horasMes: number;
  ocupacaoPct: number;
}) {
  if (!hora) {
    return (
      <Card>
        {motivo === "HORAS" ? (
          <EmptyState
            icon={<IconClock />}
            title="Faltam suas horas de atendimento"
            description="Defina seus horários de trabalho ou digite quantas horas você atende por mês."
            action={
              <Link href="/config/horarios" className={buttonClasses("primary", "md")}>
                Definir horários
              </Link>
            }
          />
        ) : motivo === "OCUPACAO" ? (
          <EmptyState
            icon={<IconCalculator />}
            title="Falta a ocupação da agenda"
            description="Diga quanto das suas horas abertas vira atendimento, de 1 a 100%."
          />
        ) : (
          <EmptyState
            icon={<IconCalculator />}
            title="Faltam seus custos do mês"
            description="Lance suas despesas fixas no Financeiro ou digite o total, e diga quanto você quer tirar por mês."
            action={
              <Link href="/financeiro?despesa=1" className={buttonClasses("primary", "md")}>
                Lançar despesa
              </Link>
            }
          />
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="sm:p-6">
        <p className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
            <IconClock width={16} height={16} />
          </span>
          Sua hora custa
        </p>
        <p className="mt-3 text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums text-ink">
          {brl(hora.custoHoraCents)}
        </p>
        <p className="mt-3 text-[13.5px] leading-snug text-ink-soft">
          {prolaboreCents > 0
            ? "É o mínimo que cada hora de atendimento precisa render para pagar o estúdio e o seu pró-labore."
            : "É o mínimo que cada hora de atendimento precisa render para pagar as despesas do estúdio."}
        </p>
        <p className="mt-3 rounded-[14px] bg-surface-sunken px-3.5 py-2.5 text-[12.5px] leading-snug tabular-nums text-ink-soft">
          ({brl(despesasCents)} de despesas + {brl(prolaboreCents)} de pró-labore) ÷{" "}
          {formatarHoras(hora.horasAtendendo)} atendendo ({formatarHoras(horasMes)} ×{" "}
          {formatarPct(ocupacaoPct, 1)} de ocupação)
        </p>
        {prolaboreCents === 0 ? (
          <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-warning">
            <IconAlert width={15} height={15} className="mt-px shrink-0" />
            <span>
              Sem pró-labore, essa conta não paga você.{" "}
              <button
                type="button"
                onClick={() => document.getElementById("hora-prolabore")?.focus()}
                className="font-semibold underline underline-offset-2"
              >
                Diga quanto quer tirar por mês
              </button>
              .
            </span>
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dicas dos campos                                                    */
/* ------------------------------------------------------------------ */

function DicaDespesas({
  despesas,
  editado,
  restaurar,
}: {
  despesas: DespesasDoMes;
  editado: boolean;
  restaurar: () => void;
}) {
  if (despesas.origem === "NENHUMA") {
    return (
      <>
        Nada lançado no Financeiro ainda. Digite o total do mês (aluguel, internet, MEI…) ou{" "}
        <LinkNaDica href="/financeiro?despesa=1">lance suas despesas fixas</LinkNaDica>.
      </>
    );
  }

  const voltar: ReactNode = editado ? (
    <>
      {" "}
      <AcaoNaDica onClick={restaurar}>Voltar para {brl(despesas.totalCents)}</AcaoNaDica>
    </>
  ) : null;
  const semMaterial = despesas.materialForaCents > 0;

  if (despesas.origem === "MEDIA") {
    return (
      <>
        Você não tem despesa fixa no Financeiro. Usamos a média das despesas de {despesas.meses}
        {semMaterial ? ", sem material (ele entra no custo de cada serviço)" : ""}.{voltar}
      </>
    );
  }

  if (despesas.itens.length === 0) {
    return (
      <>
        Suas despesas fixas do Financeiro são de material, que já entra no custo de cada
        serviço.{voltar}
      </>
    );
  }

  const n = despesas.itens.length;
  return (
    <>
      {n === 1 ? "Sua despesa fixa do Financeiro: " : `Soma das suas ${n} despesas fixas do Financeiro: `}
      {listarNomes(despesas.itens.map((i) => i.description))}.
      {semMaterial ? " Material ficou de fora: ele entra no custo de cada serviço." : ""}
      {voltar}
    </>
  );
}

function DicaHoras({
  horario,
  editado,
  restaurar,
}: {
  horario: DadosHora["horario"];
  editado: boolean;
  restaurar: () => void;
}) {
  if (horario.minutosSemana <= 0) {
    if (horario.dias > 0) {
      return (
        <>
          Seus bloqueios semanais ocupam todos os seus horários.{" "}
          <LinkNaDica href="/agenda/bloqueios">Ver bloqueios</LinkNaDica>
        </>
      );
    }
    return (
      <>
        Você ainda não definiu seus horários de trabalho. Digite as horas ou{" "}
        <LinkNaDica href="/config/horarios">defina seus horários</LinkNaDica>.
      </>
    );
  }
  return (
    <>
      Seus horários somam {formatarHoras(horario.minutosSemana / 60)} por semana
      {horario.minutosBloqueados > 0
        ? ` (já sem ${formatarHoras(horario.minutosBloqueados / 60)} de bloqueios semanais, como almoço)`
        : ""}{" "}
      × {formatarNumero(SEMANAS_POR_MES, 2)} semanas.
      {editado ? (
        <>
          {" "}
          <AcaoNaDica onClick={restaurar}>
            Voltar para {formatarHoras((horario.minutosSemana / 60) * SEMANAS_POR_MES)}
          </AcaoNaDica>
        </>
      ) : null}
    </>
  );
}

function DicaTaxa({
  cartao,
  ligada,
  editada,
  restaurar,
}: {
  cartao: DadosHora["cartao"];
  ligada: boolean;
  editada: boolean;
  restaurar: () => void;
}) {
  if (!ligada) return <>Ligue para ver o lucro quando a cliente paga no cartão.</>;
  if (!cartao) {
    return (
      <>
        Você não tem taxa de cartão cadastrada. Digite a taxa ou{" "}
        <LinkNaDica href="/config/taxas">cadastre suas taxas</LinkNaDica>.
      </>
    );
  }
  const voltar = editada ? (
    <>
      {" "}
      <AcaoNaDica onClick={restaurar}>Voltar para {formatarPct(cartao.pct)}</AcaoNaDica>
    </>
  ) : null;
  if (cartao.origem === "RECEBIMENTOS") {
    return (
      <>
        Média do que a maquininha descontou{" "}
        {cartao.recebimentos === 1
          ? "no seu recebimento no cartão"
          : `nos seus ${cartao.recebimentos} recebimentos no cartão`}{" "}
        dos últimos 90 dias.{voltar}
      </>
    );
  }
  return (
    <>
      Média das taxas de débito, crédito à vista e crédito parcelado das suas{" "}
      <LinkNaDica href="/config/taxas">Taxas</LinkNaDica>.{voltar}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Material por atendimento                                            */
/* ------------------------------------------------------------------ */

function BlocoMaterial({ material }: { material: DadosHora["material"] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">Material por atendimento</p>
      {material.itens.length > 0 ? (
        <>
          <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
            {brl(material.porAtendimentoCents)}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            Custo de cada insumo do Estoque × o consumo por atendimento. Vale para todos os
            serviços; ajuste no serviço que gasta diferente.
          </p>
          <details className="group mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
              Ver a conta
              <IconChevronDown
                width={14}
                height={14}
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <ul className="mt-2 divide-y divide-line rounded-[14px] border border-line">
              {material.itens.map((item) => (
                <li key={item.nome} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {item.nome}
                    </span>
                    <span className="block text-[12px] tabular-nums text-ink-soft">
                      {brl(item.custoCents)} por {item.unidade} × {formatarNumero(item.consumo, 2)}{" "}
                      {item.unidade}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                    {brl(item.cents)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
          Nenhum insumo do Estoque tem custo e consumo por atendimento. Digite o material em
          cada serviço ou <LinkNaDica href="/estoque">complete o Estoque</LinkNaDica>.
        </p>
      )}
      {material.semCusto.length > 0 ? (
        <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">
          Sem custo cadastrado, {material.semCusto.length === 1 ? "ficou" : "ficaram"} de fora:{" "}
          {listarNomes(material.semCusto)}. <LinkNaDica href="/estoque">Completar no Estoque</LinkNaDica>
        </p>
      ) : null}
    </div>
  );
}
