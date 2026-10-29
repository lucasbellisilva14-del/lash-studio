"use client";

/**
 * Simulador de meta: quantos atendimentos e clientes a meta do mês pede,
 * partindo do ticket e do ritmo reais dos últimos 90 dias. Dois sliders
 * (ticket e atendimentos por semana) recalculam ao vivo. A meta digitada
 * fica salva neste aparelho.
 */
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconScissors, IconTarget } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useGuardado } from "./armazenamento";
import { AcaoNaDica, CampoDinheiro, LinkNaDica } from "./campos";
import {
  ATENDIMENTOS_POR_CLIENTE_MES,
  META_PADRAO_CENTS,
  SEMANAS_POR_MES,
  brl,
  calcularMeta,
  centavosParaCampo,
  formatarNumero,
  parseDinheiro,
} from "./calculos";
import type { DadosMeta } from "./types";

/** Passo do slider de ticket (R$ 5). */
const PASSO_TICKET = 500;
const TICKET_MAX_MIN = 50_000;
const ATENDIMENTOS_SEMANA_MAX = 60;
const DIAS_PADRAO = 5;

/** Teto do slider de ticket: o dobro do ticket atual, pelo menos R$ 500. */
function tetoTicket(ticketCents: number): number {
  return Math.max(TICKET_MAX_MIN, Math.ceil((ticketCents * 2) / PASSO_TICKET) * PASSO_TICKET);
}

function arredondarAcima(n: number): number {
  return Math.ceil(n - 1e-9);
}

export function SimuladorMeta({ dados }: { dados: DadosMeta }) {
  const ticketReal = dados.ticketMedioCents ?? dados.precoMedioServicosCents ?? 0;
  const origemTicket: "HISTORICO" | "SERVICOS" | "NENHUM" = dados.ticketMedioCents
    ? "HISTORICO"
    : dados.precoMedioServicosCents
      ? "SERVICOS"
      : "NENHUM";
  const metaRealCents = dados.metaDoMesCents ?? META_PADRAO_CENTS;

  const [metaGuardada, setMetaGuardada] = useGuardado(`${dados.chave}:meta`);
  const [ticketSlider, setTicketSlider] = useState<number | null>(null);
  const [semanaSlider, setSemanaSlider] = useState<number | null>(null);
  const idTicket = useId();
  const idSemana = useId();

  const campoMeta = metaGuardada ?? centavosParaCampo(metaRealCents);
  const metaCents = parseDinheiro(campoMeta);
  const ticketCents = ticketSlider ?? ticketReal;
  const atendimentosSemana = semanaSlider ?? dados.atendimentosPorSemana;
  const diasPorSemana = dados.diasPorSemana > 0 ? dados.diasPorSemana : DIAS_PADRAO;

  const resultado = calcularMeta({
    metaCents,
    ticketCents,
    atendimentosPorSemana: atendimentosSemana,
    clientesAtivas: dados.clientesAtivas,
    diasPorSemana,
  });

  if (origemTicket === "NENHUM") {
    return (
      <Card>
        <EmptyState
          icon={<IconScissors />}
          title="Falta um ticket para simular"
          description="Sem atendimentos concluídos nem serviços cadastrados, não dá para saber quanto cada atendimento rende."
          action={
            <Link href="/servicos" className={buttonClasses("primary", "md")}>
              Cadastrar serviço
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] @3xl:items-start">
        <Card>
          <CardHeader
            title="Sua meta e seu ritmo"
            description="Mexa nos controles para ver o que muda."
          />
          <CardBody className="space-y-5">
            <Field
              label="Quero ganhar por mês"
              htmlFor="meta-valor"
              hint={
                <>
                  {dados.metaDoMesCents
                    ? `Sua meta deste mês no Financeiro: ${brl(dados.metaDoMesCents)}.`
                    : "Você não tem meta neste mês. "}
                  {!dados.metaDoMesCents ? (
                    <LinkNaDica href="/financeiro">Defina no Financeiro</LinkNaDica>
                  ) : null}
                  {metaGuardada !== null && metaGuardada !== centavosParaCampo(metaRealCents) ? (
                    <>
                      {" "}
                      <AcaoNaDica onClick={() => setMetaGuardada(null)}>
                        Voltar para {brl(metaRealCents)}
                      </AcaoNaDica>
                    </>
                  ) : null}
                </>
              }
            >
              <CampoDinheiro
                id="meta-valor"
                value={campoMeta}
                onChange={(e) => setMetaGuardada(e.target.value)}
                placeholder="0,00"
              />
            </Field>

            <Slider
              id={idTicket}
              rotulo="Ticket médio"
              valorTexto={brl(ticketCents)}
              min={PASSO_TICKET}
              max={tetoTicket(ticketReal)}
              step={PASSO_TICKET}
              value={ticketCents}
              onChange={setTicketSlider}
              dica={
                <>
                  {origemTicket === "HISTORICO"
                    ? `Receita líquida ÷ ${dados.atendimentosNoPeriodo} atendimentos concluídos nas últimas ${formatarNumero(dados.semanasConsideradas, 0)} semanas: ${brl(ticketReal)}.`
                    : `Sem histórico ainda: usamos o preço médio dos seus serviços, ${brl(ticketReal)}.`}
                  {ticketSlider !== null && ticketSlider !== ticketReal ? (
                    <>
                      {" "}
                      <AcaoNaDica onClick={() => setTicketSlider(null)}>Voltar</AcaoNaDica>
                    </>
                  ) : null}
                </>
              }
            />

            <Slider
              id={idSemana}
              rotulo="Atendimentos por semana"
              valorTexto={formatarNumero(atendimentosSemana, 1)}
              min={0}
              max={ATENDIMENTOS_SEMANA_MAX}
              step={1}
              value={Math.round(atendimentosSemana)}
              onChange={setSemanaSlider}
              dica={
                <>
                  {dados.atendimentosNoPeriodo > 0
                    ? `Hoje você faz ${formatarNumero(dados.atendimentosPorSemana, 1)} por semana, na média das últimas ${formatarNumero(dados.semanasConsideradas, 0)} semanas.`
                    : "Nenhum atendimento concluído ainda. Arraste para simular um ritmo."}
                  {semanaSlider !== null && semanaSlider !== dados.atendimentosPorSemana ? (
                    <>
                      {" "}
                      <AcaoNaDica onClick={() => setSemanaSlider(null)}>Voltar</AcaoNaDica>
                    </>
                  ) : null}
                </>
              }
            />

            <p className="text-[12.5px] leading-snug text-ink-soft">
              {dados.diasPorSemana > 0 ? (
                <>
                  Você atende {dados.diasPorSemana}{" "}
                  {dados.diasPorSemana === 1 ? "dia" : "dias"} por semana, pelos seus horários.
                </>
              ) : (
                <>
                  Sem horários cadastrados, consideramos {DIAS_PADRAO} dias de trabalho por
                  semana. <LinkNaDica href="/config/horarios">Definir horários</LinkNaDica>
                </>
              )}{" "}
              Clientes ativas: {dados.clientesAtivas} (com atendimento concluído nos últimos 60
              dias).
            </p>
          </CardBody>
        </Card>

        <div aria-live="polite">
          {resultado ? (
            <Card>
              <CardBody className="sm:p-6">
                <p className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
                    <IconTarget width={16} height={16} />
                  </span>
                  Para ganhar {brl(metaCents)} por mês
                </p>
                <p className="mt-3 text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums text-ink">
                  {resultado.atendimentosMes}
                  <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink-soft">
                    {" "}
                    atendimentos
                  </span>
                </p>
                <p className="mt-2 text-[13.5px] leading-snug text-ink-soft">
                  No mês, a {brl(ticketCents)} cada. Isso dá{" "}
                  <strong className="font-semibold text-ink">
                    {formatarNumero(resultado.atendimentosSemana, 1)} por semana
                  </strong>{" "}
                  e{" "}
                  <strong className="font-semibold text-ink">
                    {formatarNumero(resultado.atendimentosDia, 1)} por dia de trabalho
                  </strong>{" "}
                  ({diasPorSemana} {diasPorSemana === 1 ? "dia" : "dias"} por semana).
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Numero
                    rotulo="Clientes ativas necessárias"
                    valor={String(resultado.clientesNecessarias)}
                    dica={`Você tem ${dados.clientesAtivas}.`}
                  />
                  <Numero
                    rotulo="Faltam conquistar"
                    valor={String(resultado.clientesFaltam)}
                    tom={resultado.clientesFaltam === 0 ? "success" : "ink"}
                    dica={
                      resultado.clientesFaltam === 0
                        ? "Sua base já dá conta."
                        : "Novas ou que voltaram."
                    }
                  />
                </div>
                <p className="mt-2 text-[12px] leading-snug text-ink-faint">
                  Premissa: cada cliente ativa faz, em média,{" "}
                  {formatarNumero(ATENDIMENTOS_POR_CLIENTE_MES, 1)} atendimentos por mês (uma
                  manutenção a cada 3 ou 4 semanas). Clientes = atendimentos ÷{" "}
                  {formatarNumero(ATENDIMENTOS_POR_CLIENTE_MES, 1)}.
                </p>

                <div className="mt-5 rounded-[14px] bg-surface-sunken px-3.5 py-3 text-[13px] leading-snug text-ink-soft">
                  {resultado.atendimentosAtuaisMes > 0 ? (
                    <>
                      <p>
                        No ritmo de {formatarNumero(atendimentosSemana, 1)} por semana (
                        {arredondarAcima(resultado.atendimentosAtuaisMes)} por mês) você fatura{" "}
                        <strong className="font-semibold tabular-nums text-ink">
                          {brl(resultado.faturamentoAtualCents)}
                        </strong>
                        {resultado.faltaCents > 0 ? (
                          <>
                            : faltam{" "}
                            <strong className="font-semibold tabular-nums text-ink">
                              {brl(resultado.faltaCents)}
                            </strong>
                            .
                          </>
                        ) : (
                          <>
                            : a meta já está batida, com{" "}
                            <strong className="font-semibold tabular-nums text-success">
                              {brl(-resultado.faltaCents)}
                            </strong>{" "}
                            de folga.
                          </>
                        )}
                      </p>
                      {resultado.ticketNecessarioCents !== null && resultado.faltaCents > 0 ? (
                        <p className="mt-2">
                          Sem mudar o volume, o ticket que resolve é{" "}
                          <strong className="font-semibold tabular-nums text-ink">
                            {brl(resultado.ticketNecessarioCents)}
                          </strong>{" "}
                          por atendimento.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p>
                      Sem atendimentos por semana não há faturamento. Arraste o controle para
                      simular um ritmo.
                    </p>
                  )}
                </div>
                <p className="mt-3 text-[12px] leading-snug text-ink-faint">
                  Mês = {formatarNumero(SEMANAS_POR_MES, 2)} semanas. Atendimentos arredondados
                  para cima.
                </p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<IconTarget />}
                title="Quanto você quer ganhar?"
                description="Digite a meta do mês para ver quantos atendimentos e clientes ela pede."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({
  id,
  rotulo,
  valorTexto,
  min,
  max,
  step,
  value,
  onChange,
  dica,
}: {
  id: string;
  rotulo: string;
  valorTexto: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (valor: number) => void;
  dica: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {rotulo}
        </label>
        <output htmlFor={id} className="text-[15px] font-bold tabular-nums text-ink">
          {valorTexto}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valorTexto}
        className="h-11 w-full cursor-pointer accent-accent"
      />
      <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{dica}</p>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  dica,
  tom = "ink",
}: {
  rotulo: string;
  valor: string;
  dica?: string;
  tom?: "ink" | "success";
}) {
  return (
    <div className="rounded-[14px] border border-line px-3.5 py-3">
      <p className="text-[12.5px] font-semibold text-ink-soft">{rotulo}</p>
      <p
        className={cn(
          "mt-1 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums",
          tom === "success" ? "text-success" : "text-ink",
        )}
      >
        {valor}
      </p>
      {dica ? <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{dica}</p> : null}
    </div>
  );
}
