/**
 * Previsão de estoque — contas puras. Para cada insumo com consumo por
 * atendimento: quantos atendimentos ainda aguenta, em que dia acaba (no ritmo
 * de atendimentos por dia útil) e, para o que vence, qual limite vem antes.
 */
import { addDays } from "date-fns";
import { diffLocalDays, localWeekday } from "@/lib/dates";

/** Dias antes do limite em que ela deve comprar. */
export const DIAS_PARA_COMPRAR = 3;
/** Até aqui (dias) o selo é "perigo"; até ALERTA_ATENCAO, "aviso". */
export const ALERTA_URGENTE = 7;
export const ALERTA_ATENCAO = 14;
/** Dias úteis padrão quando ela não tem horários: segunda a sexta. */
export const DIAS_UTEIS_PADRAO = [1, 2, 3, 4, 5];

export type ProdutoParaPrever = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  consumo: number;
  abertoEm: Date | null;
  validadeDiasAposAbrir: number | null;
  vence: Date | null;
};

export type ProdutoPrevisto = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  consumo: number;
  /** quantidade ÷ consumo, arredondado para baixo. */
  atendimentosRestantes: number;
  /** Dia em que acaba pelo consumo (null sem ritmo de atendimentos). */
  acabaEm: Date | null;
  /** Validade (pós-abertura ou do rótulo, a que vier primeiro). */
  validade: Date | null;
  /** O que chega primeiro: acabar ou vencer. Null sem nenhum dos dois. */
  limite: { data: Date; motivo: "CONSUMO" | "VALIDADE"; dias: number } | null;
  /** 3 dias antes do limite (nunca antes de hoje). */
  comprarAte: Date | null;
  /** Já acabou (quantidade zero) ou já venceu. */
  tom: "danger" | "warning" | null;
};

/** Dia útil = dia da semana com horário ativo. */
export function contarDiasUteis(de: Date, ate: Date, diasUteis: number[], tz: string): number {
  const total = Math.max(0, diffLocalDays(de, ate, tz));
  let n = 0;
  for (let i = 0; i < total; i += 1) {
    if (diasUteis.includes(localWeekday(addDays(de, i), tz))) n += 1;
  }
  return n;
}

/** O dia útil número `n` a partir de hoje (n = 1 é o próximo dia útil, hoje incluído). */
export function dataDoDiaUtil(agora: Date, n: number, diasUteis: number[], tz: string): Date {
  const uteis = diasUteis.length > 0 ? diasUteis : DIAS_UTEIS_PADRAO;
  let restantes = Math.max(1, Math.ceil(n));
  let dia = agora;
  // Limite de segurança: 2 anos.
  for (let i = 0; i < 730; i += 1) {
    if (uteis.includes(localWeekday(dia, tz))) {
      restantes -= 1;
      if (restantes <= 0) return dia;
    }
    dia = addDays(dia, 1);
  }
  return dia;
}

export function preverEstoque(entrada: {
  produtos: ProdutoParaPrever[];
  /** Atendimentos concluídos por dia útil (0 = sem ritmo). */
  atendimentosPorDiaUtil: number;
  /** Dias da semana com horário ativo (0 = domingo). */
  diasUteis: number[];
  agora: Date;
  tz: string;
}): ProdutoPrevisto[] {
  const { atendimentosPorDiaUtil, diasUteis, agora, tz } = entrada;

  const previstos = entrada.produtos
    .filter((p) => p.consumo > 0)
    .map((p): ProdutoPrevisto => {
      const atendimentosRestantes = Math.max(0, Math.floor(p.quantidade / p.consumo));

      let acabaEm: Date | null = null;
      if (atendimentosRestantes === 0) {
        acabaEm = agora;
      } else if (atendimentosPorDiaUtil > 0) {
        acabaEm = dataDoDiaUtil(
          agora,
          atendimentosRestantes / atendimentosPorDiaUtil,
          diasUteis,
          tz,
        );
      }

      const candidatas: Date[] = [];
      if (p.abertoEm && p.validadeDiasAposAbrir && p.validadeDiasAposAbrir > 0) {
        candidatas.push(addDays(p.abertoEm, p.validadeDiasAposAbrir));
      }
      if (p.vence) candidatas.push(p.vence);
      const validade =
        candidatas.length > 0
          ? candidatas.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b))
          : null;

      let limite: ProdutoPrevisto["limite"] = null;
      if (acabaEm && (!validade || acabaEm.getTime() <= validade.getTime())) {
        limite = { data: acabaEm, motivo: "CONSUMO", dias: diffLocalDays(agora, acabaEm, tz) };
      } else if (validade) {
        limite = { data: validade, motivo: "VALIDADE", dias: diffLocalDays(agora, validade, tz) };
      }

      let comprarAte: Date | null = null;
      let tom: ProdutoPrevisto["tom"] = null;
      if (limite) {
        const sugerida = addDays(limite.data, -DIAS_PARA_COMPRAR);
        comprarAte = sugerida.getTime() < agora.getTime() ? agora : sugerida;
        tom = limite.dias <= ALERTA_URGENTE ? "danger" : limite.dias <= ALERTA_ATENCAO ? "warning" : null;
      }

      return {
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        unidade: p.unidade,
        quantidade: p.quantidade,
        consumo: p.consumo,
        atendimentosRestantes,
        acabaEm,
        validade,
        limite,
        comprarAte,
        tom,
      };
    });

  // Quem acaba antes primeiro; sem limite vai para o fim, por nome.
  return previstos.sort((a, b) => {
    if (a.limite && b.limite) return a.limite.dias - b.limite.dias || a.nome.localeCompare(b.nome, "pt-BR");
    if (a.limite) return -1;
    if (b.limite) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
