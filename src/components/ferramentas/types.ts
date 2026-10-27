import type { PaymentMethod } from "@/lib/constants";

/** Taxa da maquininha por forma de pagamento, em % (3.5 = 3,5%), como no PaymentMethodFee. */
export type Taxas = Record<PaymentMethod, number>;

/** Serviço ativo, só o que as calculadoras usam. */
export type ServicoBasico = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

/** Dados da aba Cobrança (carregados no servidor, contas no aparelho). */
export type DadosCobranca = {
  /** Prefixo das preferências guardadas no aparelho (por conta). */
  chave: string;
  taxas: Taxas;
  /** Débito ou crédito com taxa maior que zero. */
  temTaxaDeCartao: boolean;
  servicos: ServicoBasico[];
};

/**
 * De onde veio o valor de "Despesas fixas por mês".
 * FIXAS: despesas FIXA_MENSAL ativas do Financeiro (cada uma contada uma vez).
 * MEDIA: sem fixas, média das despesas dos últimos 3 meses fechados.
 * NENHUMA: nada lançado.
 * `materialForaCents`: despesas de material deixadas de fora porque o material
 * já entra no custo de cada serviço (pelo Estoque).
 */
export type DespesasDoMes =
  | {
      origem: "FIXAS";
      totalCents: number;
      itens: { description: string; amountCents: number }[];
      materialForaCents: number;
    }
  | {
      origem: "MEDIA";
      totalCents: number;
      /** "julho, agosto e setembro" */
      meses: string;
      materialForaCents: number;
    }
  | { origem: "NENHUMA"; totalCents: 0 };

export type ItemMaterial = {
  nome: string;
  unidade: string;
  /** Custo de 1 unidade (Product.costCents). */
  custoCents: number;
  /** Consumo por atendimento, na mesma unidade (Product.usagePerService). */
  consumo: number;
  /** custo × consumo, arredondado. */
  cents: number;
};

/** Dados da aba Sua hora. */
export type DadosHora = {
  chave: string;
  despesas: DespesasDoMes;
  horario: {
    /** Minutos de atendimento por semana, já sem os bloqueios semanais. */
    minutosSemana: number;
    /** Minutos de bloqueio semanal (almoço...) dentro dos horários. */
    minutosBloqueados: number;
    /** Dias da semana com horário ativo. */
    dias: number;
  };
  /** Ocupação real das últimas semanas (atendimentos concluídos ÷ horas abertas). */
  ocupacaoReal: { pct: number; atendimentos: number; semanas: number } | null;
  material: {
    /** Soma de custo × consumo dos insumos ativos (vale para todo atendimento). */
    porAtendimentoCents: number;
    itens: ItemMaterial[];
    /** Insumos com consumo por atendimento, mas sem custo cadastrado. */
    semCusto: string[];
  };
  /** Taxa média do cartão, quando há dado para calcular. */
  cartao: {
    pct: number;
    origem: "RECEBIMENTOS" | "TAXAS";
    recebimentos: number;
  } | null;
  servicos: ServicoBasico[];
};
