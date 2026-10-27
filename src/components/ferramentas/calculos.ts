/**
 * Contas das Ferramentas — funções puras, sempre em centavos.
 * Taxas são percentuais (3.5 = 3,5%), as mesmas do PaymentMethodFee e do applyFee.
 */
import { applyFee, formatBRL, parseBRL } from "@/lib/money";
import type { PaymentMethod } from "@/lib/constants";
import type { Taxas } from "./types";

/** Semanas por mês para levar os horários da semana ao mês. */
export const SEMANAS_POR_MES = 4.33;
/** Ocupação da agenda usada quando ela não digitou outra. */
export const OCUPACAO_PADRAO = 70;
/** Margem (fração do preço) a partir da qual o serviço é saudável. */
export const MARGEM_SAUDAVEL = 0.2;

/* ------------------------------------------------------------------ */
/* Entrada e formatação                                                */
/* ------------------------------------------------------------------ */

/** Centavos (pode ter fração) → "R$ 1.250,00", sem "-R$ 0,00". */
export function brl(cents: number): string {
  return formatBRL(Math.round(cents) + 0);
}

/**
 * Campo de dinheiro → centavos (nunca negativo). Usa o parseBRL; antes,
 * troca o ponto decimal do teclado ("250.5") por vírgula, que o parseBRL
 * leria como milhar.
 */
export function parseDinheiro(bruto: string): number {
  const texto = bruto.trim();
  if (texto === "") return 0;
  const normalizado =
    !texto.includes(",") && /\.\d{1,2}$/.test(texto)
      ? texto.replace(/\.(\d{1,2})$/, ",$1")
      : texto;
  return Math.max(0, parseBRL(normalizado));
}

/** "70" | "3,5" | "3.5" | "1.250" | "12%" → número; null se vazio ou ilegível. */
export function parseNumero(bruto: string): number | null {
  const texto = bruto.trim().replace(/[\s%]/g, "");
  if (texto === "") return null;
  let normalizado = texto;
  if (texto.includes(",")) normalizado = texto.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) normalizado = texto.replace(/\./g, "");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Centavos → "1250,00" (para preencher campo). */
export function centavosParaCampo(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2).replace(".", ",");
}

/** 173.2 → "173,2" (para preencher campo). */
export function numeroParaCampo(n: number, casas = 1): string {
  const fator = 10 ** casas;
  return String(Math.round(n * fator) / fator).replace(".", ",");
}

export function formatarNumero(n: number, casas = 1): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

export function formatarPct(n: number, casas = 2): string {
  return `${formatarNumero(n, casas)}%`;
}

export function formatarHoras(horas: number): string {
  return `${formatarNumero(horas, 1)} h`;
}

/** 150 → "2h30" · 60 → "1h" · 45 → "45min" */
export function formatarDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** ["a", "b", "c"] → "a, b e c" */
export function juntar(lista: string[]): string {
  if (lista.length <= 1) return lista[0] ?? "";
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

/** Até `max` nomes; o resto vira "e mais N". */
export function listarNomes(nomes: string[], max = 3): string {
  if (nomes.length <= max) return juntar(nomes);
  return `${nomes.slice(0, max).join(", ")} e mais ${nomes.length - max}`;
}

/* ------------------------------------------------------------------ */
/* Cobrança                                                            */
/* ------------------------------------------------------------------ */

export type ModoTaxa = "absorver" | "repassar";

export type FormaCobranca = {
  metodo: PaymentMethod;
  /** O que a cliente paga. */
  cobradoCents: number;
  taxaPct: number;
  taxaCents: number;
  /** O que cai para a profissional (cobrado − taxa, pelo applyFee). */
  recebeCents: number;
};

export type ResultadoCobranca = {
  pix: FormaCobranca;
  dinheiro: FormaCobranca;
  debito: FormaCobranca;
  creditoVista: FormaCobranca;
  /** Total no crédito parcelado (a mesma taxa vale para 2x…Nx). */
  parcelado: FormaCobranca;
  /** Valor de cada parcela, de 2x até o máximo escolhido. */
  parcelas: { n: number; valorCents: number }[];
};

/**
 * Quanto cobrar para receber `baseCents` limpo depois da taxa: base ÷ (1 − taxa),
 * acertado ao centavo com o applyFee (o menor valor que entrega a base inteira).
 */
export function cobrarRepassando(baseCents: number, taxaPct: number): number {
  if (!(taxaPct > 0) || taxaPct >= 100) return baseCents;
  let total = Math.ceil(baseCents / (1 - taxaPct / 100));
  while (applyFee(total, taxaPct).netCents < baseCents) total += 1;
  while (total - 1 >= baseCents && applyFee(total - 1, taxaPct).netCents >= baseCents) total -= 1;
  return total;
}

export function calcularCobranca(entrada: {
  baseCents: number;
  pixDescontoPct: number;
  parcelasMax: number;
  modo: ModoTaxa;
  taxas: Taxas;
}): ResultadoCobranca {
  const { baseCents, taxas, modo } = entrada;

  const forma = (metodo: PaymentMethod, cobradoCents: number): FormaCobranca => {
    const taxaPct = taxas[metodo] ?? 0;
    const { feeCents, netCents } = applyFee(cobradoCents, taxaPct);
    return { metodo, cobradoCents, taxaPct, taxaCents: feeCents, recebeCents: netCents };
  };
  const noCartao = (metodo: PaymentMethod): FormaCobranca =>
    forma(
      metodo,
      modo === "repassar" ? cobrarRepassando(baseCents, taxas[metodo] ?? 0) : baseCents,
    );

  const desconto = Math.min(100, Math.max(0, entrada.pixDescontoPct));
  const parcelado = noCartao("CREDITO_PARCELADO");
  const parcelas: ResultadoCobranca["parcelas"] = [];
  for (let n = 2; n <= entrada.parcelasMax; n += 1) {
    parcelas.push({ n, valorCents: Math.round(parcelado.cobradoCents / n) });
  }

  return {
    pix: forma("PIX", Math.round(baseCents * (1 - desconto / 100))),
    dinheiro: forma("DINHEIRO", baseCents),
    debito: noCartao("DEBITO"),
    creditoVista: noCartao("CREDITO_VISTA"),
    parcelado,
    parcelas,
  };
}

/**
 * Texto curto para colar no WhatsApp. Ex.:
 * "Lash Volume Brasileiro: R$ 250,00 · No Pix: R$ 237,50 · No cartão: até 3x de R$ 83,33"
 */
export function textoParaWhatsApp(entrada: {
  titulo: string;
  baseCents: number;
  resultado: ResultadoCobranca;
  modo: ModoTaxa;
  parcelasMax: number;
}): string {
  const { titulo, baseCents, resultado, modo, parcelasMax } = entrada;
  const partes = [`${titulo}: ${brl(baseCents)}`];
  if (resultado.pix.cobradoCents !== baseCents) {
    partes.push(`No Pix: ${brl(resultado.pix.cobradoCents)}`);
  }
  const ultima = resultado.parcelas[resultado.parcelas.length - 1];

  if (modo === "absorver") {
    partes.push(
      ultima
        ? `No cartão: até ${ultima.n}x de ${brl(ultima.valorCents)}`
        : `No cartão: ${brl(baseCents)} à vista`,
    );
    return partes.join(" · ");
  }

  const debito = resultado.debito.cobradoCents;
  const vista = resultado.creditoVista.cobradoCents;
  if (debito === vista) {
    partes.push(`No débito ou crédito à vista: ${brl(debito)}`);
  } else {
    partes.push(`No débito: ${brl(debito)}`);
    partes.push(`No crédito à vista: ${brl(vista)}`);
  }
  if (ultima && parcelasMax >= 2) {
    partes.push(
      `Em até ${ultima.n}x de ${brl(ultima.valorCents)} (total ${brl(resultado.parcelado.cobradoCents)})`,
    );
  }
  return partes.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Sua hora                                                            */
/* ------------------------------------------------------------------ */

export type ResultadoHora = {
  custoMesCents: number;
  /** Horas do mês × ocupação. */
  horasAtendendo: number;
  /** (despesas + pró-labore) ÷ horas atendendo. */
  custoHoraCents: number;
};

export function calcularHora(entrada: {
  despesasCents: number;
  prolaboreCents: number;
  horasMes: number;
  ocupacaoPct: number;
}): ResultadoHora | null {
  const horasAtendendo = (entrada.horasMes * entrada.ocupacaoPct) / 100;
  const custoMesCents = entrada.despesasCents + entrada.prolaboreCents;
  if (!(horasAtendendo > 0) || !(custoMesCents > 0)) return null;
  return { custoMesCents, horasAtendendo, custoHoraCents: custoMesCents / horasAtendendo };
}

export type Selo = "ABAIXO_DO_CUSTO" | "MARGEM_BAIXA" | "SAUDAVEL";

export const SELOS: Record<Selo, { rotulo: string; tom: "danger" | "warning" | "success" }> = {
  ABAIXO_DO_CUSTO: { rotulo: "Abaixo do custo", tom: "danger" },
  MARGEM_BAIXA: { rotulo: "Margem baixa", tom: "warning" },
  SAUDAVEL: { rotulo: "Saudável", tom: "success" },
};

export type ContaServico = {
  tempoCents: number;
  materialCents: number;
  taxaCents: number;
  lucroCents: number;
  /** Lucro ÷ preço (null se o preço é zero). */
  margem: number | null;
  selo: Selo;
};

/** Lucro = preço − (duração/60 × hora) − material − taxa do cartão. */
export function calcularServico(entrada: {
  precoCents: number;
  duracaoMin: number;
  custoHoraCents: number;
  materialCents: number;
  taxaPct: number;
}): ContaServico {
  const tempoCents = (entrada.duracaoMin / 60) * entrada.custoHoraCents;
  const taxaCents = (entrada.precoCents * entrada.taxaPct) / 100;
  const lucroCents = entrada.precoCents - tempoCents - entrada.materialCents - taxaCents;
  const margem = entrada.precoCents > 0 ? lucroCents / entrada.precoCents : null;
  const selo: Selo =
    lucroCents < 0
      ? "ABAIXO_DO_CUSTO"
      : margem === null || margem < MARGEM_SAUDAVEL
        ? "MARGEM_BAIXA"
        : "SAUDAVEL";
  return {
    tempoCents,
    materialCents: entrada.materialCents,
    taxaCents,
    lucroCents,
    margem,
    selo,
  };
}
