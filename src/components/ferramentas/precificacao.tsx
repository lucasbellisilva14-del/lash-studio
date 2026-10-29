"use client";

/**
 * Precificação de serviço: quanto custa fazer (tempo + material) e o preço
 * que entrega a margem que ela quer. A hora dela sai dos mesmos números da
 * aba Sua hora (despesas e horas do servidor; pró-labore e ocupação deste
 * aparelho). Serviço escolhido, margem e material manual ficam no aparelho.
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { IconAlert, IconChevronDown, IconScissors, IconTag } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useGuardado } from "./armazenamento";
import { CampoComUnidade, CampoDinheiro, LinkNaDica } from "./campos";
import {
  MARGEM_MAXIMA,
  MARGEM_MINIMA_PRECO,
  MARGEM_PADRAO,
  OCUPACAO_PADRAO,
  SELOS,
  brl,
  calcularHora,
  calcularPreco,
  formatarDuracao,
  formatarNumero,
  formatarPct,
  parseDinheiro,
  parseNumero,
} from "./calculos";
import type { DadosPreco } from "./types";

export function Precificacao({ dados }: { dados: DadosPreco }) {
  const [servicoGuardado, setServicoGuardado] = useGuardado(`${dados.chave}:preco-servico`);
  const [margemGuardada, setMargem] = useGuardado(`${dados.chave}:preco-margem`);
  const [materialManual, setMaterialManual] = useGuardado(`${dados.chave}:preco-material`);
  // As mesmas chaves da aba Sua hora: a conta da hora é uma só.
  const [prolaboreGuardado, setProlabore] = useGuardado(`${dados.chave}:prolabore`);
  const [ocupacaoGuardada] = useGuardado(`${dados.chave}:ocupacao`);

  const servico =
    dados.servicos.find((s) => s.id === servicoGuardado) ?? dados.servicos[0] ?? null;
  const margem = margemGuardada ?? String(MARGEM_PADRAO);
  const margemPct = parseNumero(margem);
  const margemInvalida =
    margem.trim() !== "" && (margemPct === null || margemPct < 0 || margemPct > MARGEM_MAXIMA);

  const prolaboreCents = parseDinheiro(prolaboreGuardado ?? "");
  const ocupacaoPct = parseNumero(ocupacaoGuardada ?? "") ?? OCUPACAO_PADRAO;
  const hora = calcularHora({
    despesasCents: dados.despesasCents,
    prolaboreCents,
    horasMes: dados.horasMes,
    ocupacaoPct: ocupacaoPct > 0 && ocupacaoPct <= 100 ? ocupacaoPct : OCUPACAO_PADRAO,
  });
  const custoHoraCents = hora?.custoHoraCents ?? 0;
  const motivoSemHora: "HORAS" | "CUSTOS" | null = hora
    ? null
    : dados.horasMes <= 0
      ? "HORAS"
      : "CUSTOS";

  const temMaterialDoEstoque = dados.material.itens.length > 0;
  const materialCents = temMaterialDoEstoque
    ? dados.material.porAtendimentoCents
    : parseDinheiro(materialManual ?? "");

  const resultado = servico
    ? calcularPreco({
        precoAtualCents: servico.priceCents,
        duracaoMin: servico.durationMin,
        custoHoraCents,
        materialCents,
        margemPct: margemInvalida || margemPct === null ? MARGEM_PADRAO : margemPct,
      })
    : null;

  if (dados.servicos.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconScissors />}
          title="Nenhum serviço ativo"
          description="Cadastre seus serviços com preço e duração para calcular o preço certo de cada um."
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
            title="Serviço e margem"
            description="Escolha o serviço e diga quanto quer de lucro sobre o preço."
          />
          <CardBody className="space-y-5">
            <Field label="Serviço" htmlFor="preco-servico" hint="Preço e duração vêm do cadastro.">
              <Select
                id="preco-servico"
                value={servico?.id ?? ""}
                onChange={(e) => setServicoGuardado(e.target.value)}
              >
                {dados.servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.name} · ${brl(s.priceCents)} · ${formatarDuracao(s.durationMin)}`}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Margem que você quer"
              htmlFor="preco-margem"
              error={margemInvalida ? `Use um número de 0 a ${MARGEM_MAXIMA}%.` : undefined}
              hint="Quanto do preço deve sobrar como lucro, depois de pagar seu tempo e o material. Fica salvo neste aparelho."
            >
              <CampoComUnidade
                id="preco-margem"
                unidade="%"
                className="max-w-40"
                value={margem}
                onChange={(e) => setMargem(e.target.value)}
                placeholder={String(MARGEM_PADRAO)}
                aria-invalid={margemInvalida || undefined}
              />
            </Field>

            {temMaterialDoEstoque ? (
              <BlocoMaterialEstoque material={dados.material} />
            ) : (
              <Field
                label="Material por atendimento"
                htmlFor="preco-material"
                hint={
                  <>
                    Cadastre o custo dos produtos no{" "}
                    <LinkNaDica href="/estoque">Estoque</LinkNaDica> para a conta ficar exata.
                    Até lá, digite quanto gasta de material em um atendimento.
                  </>
                }
              >
                <CampoDinheiro
                  id="preco-material"
                  className="max-w-48"
                  value={materialManual ?? ""}
                  onChange={(e) => setMaterialManual(e.target.value || null)}
                  placeholder="0,00"
                />
              </Field>
            )}

            <Field
              label="Quanto você quer ganhar por mês"
              htmlFor="preco-prolabore"
              hint="Seu pró-labore entra no custo da hora, senão o preço só paga o estúdio. O mesmo valor da aba Sua hora."
            >
              <div className="relative w-44">
                <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-soft">
                  R$
                </span>
                <Input
                  id="preco-prolabore"
                  inputMode="decimal"
                  className="pl-10 tabular-nums"
                  value={prolaboreGuardado ?? ""}
                  onChange={(e) => setProlabore(e.target.value || null)}
                  placeholder="3.000,00"
                />
              </div>
            </Field>

            <div>
              <p className="text-[13px] font-semibold text-ink">Custo da sua hora</p>
              {hora ? (
                <>
                  <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
                    {brl(custoHoraCents)}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
                    A mesma conta da aba{" "}
                    <LinkNaDica href="/ferramentas?aba=hora">Sua hora</LinkNaDica>: (
                    {brl(dados.despesasCents)} de despesas + {brl(prolaboreCents)} de pró-labore)
                    ÷ as horas atendendo.
                    {prolaboreCents === 0
                      ? " Sem pró-labore, a hora só paga o estúdio, não você."
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-warning">
                  <IconAlert width={15} height={15} className="mt-px shrink-0" />
                  <span>
                    {motivoSemHora === "HORAS"
                      ? "Sem seus horários de trabalho não dá para saber quanto custa sua hora. "
                      : "Sem despesas ou pró-labore não dá para saber quanto custa sua hora. "}
                    Complete na aba{" "}
                    <LinkNaDica href="/ferramentas?aba=hora">Sua hora</LinkNaDica>; até lá o
                    preço abaixo considera só o material.
                  </span>
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <div aria-live="polite">
          {servico && resultado ? (
            <ResultadoPrecificacao
              servicoNome={servico.name}
              precoAtualCents={servico.priceCents}
              duracaoMin={servico.durationMin}
              custoHoraCents={custoHoraCents}
              margemPct={margemInvalida || margemPct === null ? MARGEM_PADRAO : margemPct}
              resultado={resultado}
              materialDoEstoque={temMaterialDoEstoque}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResultadoPrecificacao({
  servicoNome,
  precoAtualCents,
  duracaoMin,
  custoHoraCents,
  margemPct,
  resultado,
  materialDoEstoque,
}: {
  servicoNome: string;
  precoAtualCents: number;
  duracaoMin: number;
  custoHoraCents: number;
  margemPct: number;
  resultado: ReturnType<typeof calcularPreco>;
  materialDoEstoque: boolean;
}) {
  const selo = SELOS[resultado.selo];
  const diferenca = resultado.sugeridoCents - precoAtualCents;

  return (
    <Card>
      <CardBody className="sm:p-6">
        <p className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
            <IconTag width={16} height={16} />
          </span>
          Preço sugerido para {servicoNome}
        </p>
        <p className="mt-3 text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums text-ink">
          {brl(resultado.sugeridoCents)}
        </p>
        <p className="mt-2 text-[13.5px] leading-snug text-ink-soft">
          Com {formatarPct(margemPct, 1)} de margem: {brl(resultado.lucroSugeridoCents)} de lucro
          em cada atendimento.
        </p>

        <dl className="mt-5 divide-y divide-line rounded-[14px] border border-line text-[14px]">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-ink-soft">
              Seu tempo ({formatarDuracao(duracaoMin)} × {brl(custoHoraCents)}/h)
            </dt>
            <dd className="tabular-nums text-ink">{brl(resultado.tempoCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-ink-soft">
              Material{materialDoEstoque ? " (do Estoque)" : ""}
            </dt>
            <dd className="tabular-nums text-ink">{brl(resultado.materialCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 bg-surface-muted px-3.5 py-2.5 font-semibold">
            <dt className="text-ink">Preço mínimo (só o custo)</dt>
            <dd className="tabular-nums text-ink">{brl(resultado.custoCents)}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-[14px] bg-surface-sunken px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">
              Hoje você cobra <span className="tabular-nums">{brl(precoAtualCents)}</span>
            </p>
            <Badge tone={selo.tom}>{selo.rotulo}</Badge>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
            {resultado.selo === "ABAIXO_DO_CUSTO"
              ? `O preço atual não paga nem o custo: faltam ${brl(-resultado.lucroAtualCents)} por atendimento.`
              : resultado.margemAtual === null
                ? "Sem preço cadastrado."
                : `Sobram ${brl(resultado.lucroAtualCents)} por atendimento (margem de ${formatarPct(resultado.margemAtual * 100, 0)}). ${
                    resultado.selo === "MARGEM_BAIXA"
                      ? `Saudável é a partir de ${formatarPct(MARGEM_MINIMA_PRECO * 100, 0)}.`
                      : ""
                  }`}
            {diferenca > 0
              ? ` Para chegar na margem que você quer, suba ${brl(diferenca)}.`
              : diferenca < 0
                ? ` Seu preço já está ${brl(-diferenca)} acima do sugerido.`
                : ""}
          </p>
        </div>

        <Link
          href="/servicos"
          className={cn(buttonClasses(diferenca > 0 ? "primary" : "secondary", "lg"), "mt-4")}
        >
          Usar {brl(resultado.sugeridoCents)} como preço
        </Link>
        <p className="mt-2 text-center text-[12px] text-ink-faint">
          Abre a lista de serviços para você atualizar o preço.
        </p>
      </CardBody>
    </Card>
  );
}

function BlocoMaterialEstoque({ material }: { material: DadosPreco["material"] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">Material por atendimento</p>
      <p className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.03em] tabular-nums text-ink">
        {brl(material.porAtendimentoCents)}
      </p>
      <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
        Custo de cada insumo do Estoque × o consumo por atendimento.
      </p>
      <details className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          Ver a conta
          <IconChevronDown width={14} height={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-2 divide-y divide-line rounded-[14px] border border-line">
          {material.itens.map((item) => (
            <li key={item.nome} className="flex items-start justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{item.nome}</span>
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
      {material.semCusto.length > 0 ? (
        <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">
          Sem custo cadastrado, {material.semCusto.length === 1 ? "ficou" : "ficaram"} de fora:{" "}
          {material.semCusto.join(", ")}. <LinkNaDica href="/estoque">Completar no Estoque</LinkNaDica>
        </p>
      ) : null}
    </div>
  );
}
