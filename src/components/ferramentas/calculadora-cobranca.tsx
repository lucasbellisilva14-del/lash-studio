"use client";

/**
 * Calculadora de cobrança: responde na hora o "faz em quantas vezes?".
 * As taxas vêm do servidor; as contas rodam no aparelho. Desconto no Pix,
 * parcelas e quem paga a taxa ficam salvos neste aparelho.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { IconCalculator, IconCard, IconCheck, IconCopy, IconInfo } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useGuardado } from "./armazenamento";
import { CampoComUnidade, CampoDinheiro, LinkNaDica } from "./campos";
import {
  brl,
  calcularCobranca,
  centavosParaCampo,
  formatarPct,
  parseDinheiro,
  parseNumero,
  textoParaWhatsApp,
  type FormaCobranca,
  type ModoTaxa,
  type ResultadoCobranca,
} from "./calculos";
import type { DadosCobranca } from "./types";

const PARCELAS = Array.from({ length: 12 }, (_, i) => i + 1);
const PARCELAS_PADRAO = 3;

const MODOS = [
  { value: "absorver", label: "Você absorve" },
  { value: "repassar", label: "Você repassa" },
] as const;

function lerParcelas(guardado: string | null): number {
  const n = Number.parseInt(guardado ?? "", 10);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : PARCELAS_PADRAO;
}

/** "Taxa de 3,49% repassada" · "Sem taxa" */
function descreverTaxa(forma: FormaCobranca, modo: ModoTaxa | null): string {
  if (!(forma.taxaPct > 0)) return "sem taxa";
  const taxa = `taxa de ${formatarPct(forma.taxaPct)}`;
  return modo === "repassar" ? `${taxa} repassada` : taxa;
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // sem Clipboard API (navegador antigo ou sem https): tenta o jeito clássico
  }
  try {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    campo.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CalculadoraCobranca({ dados }: { dados: DadosCobranca }) {
  const [servicoId, setServicoId] = useState("");
  const [valor, setValor] = useState("");
  const [pixGuardado, setPixGuardado] = useGuardado(`${dados.chave}:pix`);
  const [parcelasGuardadas, setParcelasGuardadas] = useGuardado(`${dados.chave}:parcelas`);
  const [modoGuardado, setModoGuardado] = useGuardado(`${dados.chave}:modo`);
  const [copia, setCopia] = useState<{ ok: boolean; vez: number } | null>(null);

  // O aviso de "Copiado" some sozinho.
  useEffect(() => {
    if (!copia) return;
    const timer = setTimeout(() => setCopia(null), 2400);
    return () => clearTimeout(timer);
  }, [copia]);

  const pix = pixGuardado ?? "";
  const pixPct = parseNumero(pix);
  const pixInvalido = pixPct !== null && (pixPct < 0 || pixPct > 100);
  const parcelasMax = lerParcelas(parcelasGuardadas);
  const modo: ModoTaxa = modoGuardado === "repassar" ? "repassar" : "absorver";
  const baseCents = parseDinheiro(valor);
  const servico = dados.servicos.find((s) => s.id === servicoId) ?? null;

  const resultado =
    baseCents > 0
      ? calcularCobranca({
          baseCents,
          pixDescontoPct: pixInvalido ? 0 : (pixPct ?? 0),
          parcelasMax,
          modo,
          taxas: dados.taxas,
        })
      : null;
  const texto = resultado
    ? textoParaWhatsApp({
        titulo: servico?.name ?? "Valor",
        baseCents,
        resultado,
        modo,
        parcelasMax,
      })
    : "";

  function escolherServico(id: string) {
    setServicoId(id);
    const escolhido = dados.servicos.find((s) => s.id === id);
    if (escolhido) setValor(centavosParaCampo(escolhido.priceCents));
  }

  async function copiar() {
    if (!texto) return;
    const ok = await copiarTexto(texto);
    setCopia((anterior) => ({ ok, vez: (anterior?.vez ?? 0) + 1 }));
  }

  return (
    <div className="@container">
      <div className="grid gap-4 @3xl:grid-cols-2 @3xl:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Valor e condições"
              description="Desconto, parcelas e taxa ficam salvos neste aparelho."
            />
            <CardBody className="space-y-4">
              <div className="grid gap-4 @xl:grid-cols-2 @3xl:grid-cols-1">
                {dados.servicos.length > 0 ? (
                  <Field
                    label="Serviço"
                    htmlFor="cobranca-servico"
                    hint="Puxa o preço do serviço; dá para mudar o valor."
                  >
                    <Select
                      id="cobranca-servico"
                      value={servicoId}
                      onChange={(e) => escolherServico(e.target.value)}
                    >
                      <option value="">Outro valor</option>
                      {dados.servicos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {`${s.name} · ${brl(s.priceCents)}`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}

                <Field
                  label="Valor do serviço"
                  htmlFor="cobranca-valor"
                  hint={
                    dados.servicos.length > 0 ? (
                      "O preço cheio, antes de qualquer desconto."
                    ) : (
                      <>
                        O preço cheio, antes de qualquer desconto.{" "}
                        <LinkNaDica href="/servicos">Cadastre seus serviços</LinkNaDica> para
                        escolher da lista.
                      </>
                    )
                  }
                >
                  <CampoDinheiro
                    id="cobranca-valor"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Desconto no Pix"
                  htmlFor="cobranca-pix"
                  hint="Sobre o valor do serviço."
                  error={pixInvalido ? "Use de 0 a 100%." : undefined}
                >
                  <CampoComUnidade
                    id="cobranca-pix"
                    unidade="%"
                    value={pix}
                    onChange={(e) => setPixGuardado(e.target.value)}
                    placeholder="0"
                    aria-invalid={pixInvalido || undefined}
                  />
                </Field>
                <Field label="Parcelar até" htmlFor="cobranca-parcelas" hint="O máximo que você aceita.">
                  <Select
                    id="cobranca-parcelas"
                    value={String(parcelasMax)}
                    onChange={(e) => setParcelasGuardadas(e.target.value)}
                  >
                    {PARCELAS.map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? "1x (à vista)" : `${n}x`}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div>
                <p id="cobranca-modo" className="mb-1.5 text-[13px] font-semibold text-ink">
                  Taxa do cartão
                </p>
                <div role="group" aria-labelledby="cobranca-modo">
                  <Segmented
                    options={MODOS}
                    value={modo}
                    onChange={(v) => setModoGuardado(v)}
                    className="max-w-sm"
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
                  {modo === "absorver"
                    ? "Ela paga o valor do serviço e a taxa sai do que você recebe."
                    : "O valor no cartão sobe para cobrir a taxa: ela paga a diferença e você recebe o valor cheio."}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-[16px] font-bold tracking-[-0.015em] text-ink">
                Mensagem para a cliente
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-soft">Pronta para colar na conversa.</p>
              <p
                className={cn(
                  "mt-3 rounded-[14px] bg-surface-sunken px-3.5 py-3 text-[14px] leading-relaxed",
                  texto ? "select-all text-ink" : "text-ink-faint",
                )}
              >
                {texto || "Escolha um serviço ou digite o valor para montar a mensagem."}
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-3"
                disabled={!texto}
                onClick={copiar}
              >
                {copia?.ok ? (
                  <IconCheck width={18} height={18} />
                ) : (
                  <IconCopy width={18} height={18} />
                )}
                {copia?.ok ? "Copiado" : "Copiar para o WhatsApp"}
              </Button>
              <p
                role="status"
                className={copia && !copia.ok ? "mt-2 text-[12.5px] text-danger" : "sr-only"}
              >
                {copia
                  ? copia.ok
                    ? "Mensagem copiada."
                    : "Não deu para copiar. Toque e segure no texto para copiar."
                  : ""}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {!dados.temTaxaDeCartao ? (
            <Card>
              <EmptyState
                icon={<IconCard />}
                title="Cadastre as taxas da maquininha"
                description="Sem elas, débito e crédito aparecem sem desconto e o valor que cai para você fica errado."
                action={
                  <Link href="/config/taxas" className={buttonClasses("secondary", "md")}>
                    Cadastrar taxas
                  </Link>
                }
              />
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Formas de pagamento"
              description="Quanto ela paga e quanto cai para você."
            />
            {resultado ? (
              <Resultado
                resultado={resultado}
                modo={modo}
                pixPct={pixInvalido ? 0 : (pixPct ?? 0)}
                parcelasMax={parcelasMax}
              />
            ) : (
              <EmptyState
                icon={<IconCalculator />}
                title="Quanto custa o serviço?"
                description="Escolha um serviço ou digite o valor para ver Pix, débito e crédito."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Resultado({
  resultado,
  modo,
  pixPct,
  parcelasMax,
}: {
  resultado: ResultadoCobranca;
  modo: ModoTaxa;
  pixPct: number;
  parcelasMax: number;
}) {
  const { pix, dinheiro, debito, creditoVista, parcelado, parcelas } = resultado;
  return (
    <ul className="divide-y divide-line">
      <LinhaForma
        titulo="Pix"
        detalhe={primeiraMaiuscula(
          `${pixPct > 0 ? `${formatarPct(pixPct)} de desconto` : "sem desconto"} · ${descreverTaxa(pix, null)}`,
        )}
        forma={pix}
      />
      <LinhaForma titulo="Dinheiro" detalhe={primeiraMaiuscula(descreverTaxa(dinheiro, null))} forma={dinheiro} />
      <LinhaForma titulo="Débito" detalhe={primeiraMaiuscula(descreverTaxa(debito, modo))} forma={debito} />
      <LinhaForma
        titulo="Crédito à vista"
        detalhe={primeiraMaiuscula(descreverTaxa(creditoVista, modo))}
        forma={creditoVista}
      />
      {parcelasMax >= 2 ? (
        <li className="px-4 py-3.5 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">Crédito parcelado</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {primeiraMaiuscula(descreverTaxa(parcelado, modo))} · de 2x a {parcelasMax}x
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold tabular-nums tracking-[-0.01em] text-ink">
                {brl(parcelado.cobradoCents)}
              </p>
              <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-soft">
                Você recebe {brl(parcelado.recebeCents)}
              </p>
            </div>
          </div>

          <ul
            className="mt-3 grid grid-cols-2 gap-2 @xl:grid-cols-4 @3xl:grid-cols-3"
            aria-label="Valor de cada parcela"
          >
            {parcelas.map((p) => (
              <li
                key={p.n}
                className="flex items-baseline justify-between gap-2 whitespace-nowrap rounded-[14px] bg-surface-sunken px-3 py-2"
              >
                <span className="text-[13px] font-semibold tabular-nums text-ink-soft">{p.n}x</span>
                <span className="text-[14px] font-semibold tabular-nums text-ink">
                  {brl(p.valorCents)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-soft">
            <IconInfo width={15} height={15} className="mt-px shrink-0" />
            <span>
              Usa a taxa do crédito parcelado das suas Taxas para todas as parcelas.{" "}
              <LinkNaDica href="/config/taxas">Ver suas taxas</LinkNaDica>
            </span>
          </p>
        </li>
      ) : null}
    </ul>
  );
}

function LinhaForma({
  titulo,
  detalhe,
  forma,
}: {
  titulo: string;
  detalhe: string;
  forma: FormaCobranca;
}) {
  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-ink">{titulo}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">{detalhe}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-bold tabular-nums tracking-[-0.01em] text-ink">
          {brl(forma.cobradoCents)}
        </p>
        <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-soft">
          Você recebe {brl(forma.recebeCents)}
        </p>
      </div>
    </li>
  );
}
