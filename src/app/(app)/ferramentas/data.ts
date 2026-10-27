import "server-only";

/**
 * Ferramentas — leitura dos dados da conta para as calculadoras.
 * Só leitura: não materializa despesas fixas nem grava nada.
 * Toda consulta filtra por professionalId.
 */
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, SERVICE_CATEGORIES, type PaymentMethod } from "@/lib/constants";
import { dayKeyToUtcStart, formatWithPattern, timeToMinutes } from "@/lib/dates";
import { juntar } from "@/components/ferramentas/calculos";
import type {
  DadosCobranca,
  DadosHora,
  DespesasDoMes,
  ItemMaterial,
  ServicoBasico,
  Taxas,
} from "@/components/ferramentas/types";

const METODOS = Object.keys(PAYMENT_METHODS) as PaymentMethod[];
const METODOS_CARTAO: PaymentMethod[] = ["DEBITO", "CREDITO_VISTA", "CREDITO_PARCELADO"];
const ORDEM_CATEGORIAS = Object.keys(SERVICE_CATEGORIES);
const DIA_MS = 86_400_000;
const SEMANA_MS = 7 * DIA_MS;
/** Janela da taxa média real do cartão. */
const DIAS_RECEBIMENTOS = 90;
/** Janela da ocupação real da agenda. */
const SEMANAS_OCUPACAO = 4;

/** Prefixo das preferências guardadas no aparelho, por conta. */
function chaveDoAparelho(professionalId: string): string {
  return `lashos:ferramentas:${professionalId}`;
}

/* ------------------------------------------------------------------ */
/* Meses no fuso da profissional                                       */
/* ------------------------------------------------------------------ */

function chaveDoMes(data: Date, tz: string): string {
  return formatWithPattern(data, "yyyy-MM", tz);
}

function deslocarMes(chave: string, delta: number): string {
  const [ano, mes] = chave.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function inicioDoMes(chave: string, tz: string): Date {
  return dayKeyToUtcStart(`${chave}-01`, tz);
}

/** "2026-07" → "julho" */
function nomeDoMes(chave: string, tz: string): string {
  return formatWithPattern(inicioDoMes(chave, tz), "MMMM", tz);
}

/** "09:30" → 570; null se vazio ou fora do formato. */
function minutosDoDia(hora: string | null): number | null {
  if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return null;
  return timeToMinutes(hora);
}

/* ------------------------------------------------------------------ */
/* Leituras comuns                                                     */
/* ------------------------------------------------------------------ */

async function lerServicosAtivos(professionalId: string): Promise<ServicoBasico[]> {
  const servicos = await prisma.service.findMany({
    where: { professionalId, active: true },
    select: { id: true, name: true, category: true, durationMin: true, priceCents: true },
  });
  const posicao = (categoria: string) => {
    const i = ORDEM_CATEGORIAS.indexOf(categoria);
    return i === -1 ? ORDEM_CATEGORIAS.length : i;
  };
  return servicos
    .sort(
      (a, b) =>
        posicao(a.category) - posicao(b.category) || a.name.localeCompare(b.name, "pt-BR"),
    )
    .map(({ id, name, durationMin, priceCents }) => ({ id, name, durationMin, priceCents }));
}

async function lerTaxas(professionalId: string): Promise<Taxas> {
  const linhas = await prisma.paymentMethodFee.findMany({
    where: { professionalId },
    select: { method: true, feePct: true },
  });
  const taxas = {} as Taxas;
  for (const metodo of METODOS) {
    taxas[metodo] = linhas.find((l) => l.method === metodo)?.feePct ?? 0;
  }
  return taxas;
}

/* ------------------------------------------------------------------ */
/* Aba Cobrança                                                        */
/* ------------------------------------------------------------------ */

export async function carregarCobranca(professionalId: string): Promise<DadosCobranca> {
  const [taxas, servicos] = await Promise.all([
    lerTaxas(professionalId),
    lerServicosAtivos(professionalId),
  ]);
  return {
    chave: chaveDoAparelho(professionalId),
    taxas,
    temTaxaDeCartao: METODOS_CARTAO.some((metodo) => taxas[metodo] > 0),
    servicos,
  };
}

/* ------------------------------------------------------------------ */
/* Aba Sua hora                                                        */
/* ------------------------------------------------------------------ */

export async function carregarHora(
  profissional: { id: string; timezone: string; createdAt: Date },
  agora = new Date(),
): Promise<DadosHora> {
  const professionalId = profissional.id;
  const tz = profissional.timezone;

  const mesAtual = chaveDoMes(agora, tz);
  const inicioMesAtual = inicioDoMes(mesAtual, tz);
  const inicioMesAnterior = inicioDoMes(deslocarMes(mesAtual, -1), tz);
  const mesesDaMedia = [-3, -2, -1].map((delta) => deslocarMes(mesAtual, delta));
  const inicioDaMedia = inicioDoMes(mesesDaMedia[0], tz);

  // Ocupação real: semanas inteiras de histórico, até 4, desde a criação da conta.
  const semanasDeConta = Math.floor(
    (agora.getTime() - profissional.createdAt.getTime()) / SEMANA_MS,
  );
  const semanasOcupacao = Math.max(0, Math.min(SEMANAS_OCUPACAO, semanasDeConta));
  const inicioOcupacao = new Date(agora.getTime() - semanasOcupacao * SEMANA_MS);

  const [
    fixas,
    despesasDaMedia,
    horarios,
    bloqueios,
    produtos,
    recebimentosCartao,
    taxas,
    servicos,
    concluidos,
  ] = await Promise.all([
    // Fixas ainda vivas: a cópia do mês atual ou a do mês anterior que vai
    // virar a deste mês (materializarDespesasFixas copia mês a mês).
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "DESPESA",
        recurrence: "FIXA_MENSAL",
        date: { gte: inicioMesAnterior },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { description: true, category: true, amountCents: true },
    }),
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "DESPESA",
        date: { gte: inicioDaMedia, lt: inicioMesAtual },
      },
      select: { category: true, amountCents: true, date: true },
    }),
    prisma.workingHour.findMany({
      where: { professionalId, active: true },
      select: { weekday: true, startTime: true, endTime: true },
    }),
    prisma.scheduleBlock.findMany({
      where: { professionalId, type: "SEMANAL" },
      select: { weekday: true, startTime: true, endTime: true },
    }),
    prisma.product.findMany({
      where: { professionalId, active: true, usagePerService: { gt: 0 } },
      orderBy: { name: "asc" },
      select: { name: true, unit: true, costCents: true, usagePerService: true },
    }),
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "RECEITA",
        method: { in: METODOS_CARTAO },
        amountCents: { gt: 0 },
        date: { gte: new Date(agora.getTime() - DIAS_RECEBIMENTOS * DIA_MS) },
      },
      _sum: { amountCents: true, feeCents: true },
      _count: { _all: true },
    }),
    lerTaxas(professionalId),
    lerServicosAtivos(professionalId),
    semanasOcupacao > 0
      ? prisma.appointment.findMany({
          where: {
            professionalId,
            status: "CONCLUIDO",
            startAt: { gte: inicioOcupacao, lt: agora },
          },
          select: { startAt: true, endAt: true },
        })
      : Promise.resolve([] as { startAt: Date; endAt: Date }[]),
  ]);

  // Material por atendimento: a baixa automática do Estoque tira o consumo
  // de todos os insumos ativos a cada atendimento, qualquer que seja o serviço.
  // costCents é o custo de 1 unidade (un, caixa, par, ml), a mesma unidade do consumo.
  const itensMaterial: ItemMaterial[] = [];
  const semCusto: string[] = [];
  for (const produto of produtos) {
    if (produto.costCents !== null && produto.costCents > 0) {
      itensMaterial.push({
        nome: produto.name,
        unidade: produto.unit,
        custoCents: produto.costCents,
        consumo: produto.usagePerService,
        cents: Math.round(produto.costCents * produto.usagePerService),
      });
    } else {
      semCusto.push(produto.name);
    }
  }
  const materialPorAtendimento = itensMaterial.reduce((soma, item) => soma + item.cents, 0);

  // Quando o material já entra por serviço, a despesa de material sai da hora
  // (senão contaria duas vezes).
  const tirarMaterial = materialPorAtendimento > 0;
  let despesas: DespesasDoMes;

  if (fixas.length > 0) {
    // Cada fixa vira uma cópia por mês: conta uma vez, pela mais recente.
    const vistas = new Set<string>();
    const itens: { description: string; amountCents: number }[] = [];
    let materialFora = 0;
    for (const fixa of fixas) {
      const chave = `${fixa.description}\u001f${fixa.category ?? ""}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      if (tirarMaterial && fixa.category === "MATERIAL") {
        materialFora += fixa.amountCents;
        continue;
      }
      itens.push({ description: fixa.description, amountCents: fixa.amountCents });
    }
    despesas = {
      origem: "FIXAS",
      totalCents: itens.reduce((soma, item) => soma + item.amountCents, 0),
      itens,
      materialForaCents: materialFora,
    };
  } else {
    // Sem fixas: média dos últimos 3 meses fechados, a partir do primeiro mês
    // com lançamento (conta nova não dilui a média com meses vazios).
    const porMes = new Map<string, { outras: number; material: number }>();
    for (const despesa of despesasDaMedia) {
      const chave = chaveDoMes(despesa.date, tz);
      const acumulado = porMes.get(chave) ?? { outras: 0, material: 0 };
      if (despesa.category === "MATERIAL") acumulado.material += despesa.amountCents;
      else acumulado.outras += despesa.amountCents;
      porMes.set(chave, acumulado);
    }
    const primeiro = mesesDaMedia.findIndex((mes) => porMes.has(mes));
    if (primeiro === -1) {
      despesas = { origem: "NENHUMA", totalCents: 0 };
    } else {
      const considerados = mesesDaMedia.slice(primeiro);
      let outras = 0;
      let material = 0;
      for (const mes of considerados) {
        outras += porMes.get(mes)?.outras ?? 0;
        material += porMes.get(mes)?.material ?? 0;
      }
      despesas = {
        origem: "MEDIA",
        totalCents: Math.round((tirarMaterial ? outras : outras + material) / considerados.length),
        meses: juntar(considerados.map((mes) => nomeDoMes(mes, tz))),
        materialForaCents: tirarMaterial ? Math.round(material / considerados.length) : 0,
      };
    }
  }

  // Horas por semana: horários ativos menos os bloqueios semanais (almoço...).
  let minutosSemana = 0;
  let minutosBloqueados = 0;
  let dias = 0;
  for (const horario of horarios) {
    const inicio = minutosDoDia(horario.startTime);
    const fim = minutosDoDia(horario.endTime);
    if (inicio === null || fim === null || fim <= inicio) continue;
    dias += 1;

    const trechos: [number, number][] = [];
    for (const bloqueio of bloqueios) {
      if (bloqueio.weekday !== horario.weekday) continue;
      const de = minutosDoDia(bloqueio.startTime);
      const ate = minutosDoDia(bloqueio.endTime);
      if (de === null || ate === null) continue;
      const a = Math.max(de, inicio);
      const b = Math.min(ate, fim);
      if (b > a) trechos.push([a, b]);
    }
    trechos.sort((x, y) => x[0] - y[0]);

    // União dos trechos (bloqueios que se sobrepõem contam uma vez).
    let bloqueado = 0;
    let cursor = inicio;
    for (const [a, b] of trechos) {
      const de = Math.max(a, cursor);
      if (b > de) bloqueado += b - de;
      cursor = Math.max(cursor, b);
    }

    minutosSemana += fim - inicio - bloqueado;
    minutosBloqueados += bloqueado;
  }

  let ocupacaoReal: DadosHora["ocupacaoReal"] = null;
  if (semanasOcupacao > 0 && minutosSemana > 0 && concluidos.length > 0) {
    const minutosAtendidos = concluidos.reduce(
      (soma, a) => soma + Math.max(0, a.endAt.getTime() - a.startAt.getTime()) / 60_000,
      0,
    );
    const minutosAbertos = minutosSemana * semanasOcupacao;
    ocupacaoReal = {
      pct: Math.min(100, Math.round((minutosAtendidos / minutosAbertos) * 100)),
      atendimentos: concluidos.length,
      semanas: semanasOcupacao,
    };
  }

  // Taxa média do cartão: o que a maquininha de fato descontou nos recebimentos
  // recentes; sem isso, a média das taxas de cartão cadastradas.
  let cartao: DadosHora["cartao"] = null;
  const somaCartao = recebimentosCartao._sum.amountCents ?? 0;
  const taxaCartao = recebimentosCartao._sum.feeCents ?? 0;
  const qtdCartao = recebimentosCartao._count._all;
  if (qtdCartao > 0 && somaCartao > 0 && taxaCartao > 0) {
    cartao = {
      pct: Math.round((taxaCartao / somaCartao) * 10_000) / 100,
      origem: "RECEBIMENTOS",
      recebimentos: qtdCartao,
    };
  } else {
    const media =
      METODOS_CARTAO.reduce((soma, metodo) => soma + taxas[metodo], 0) / METODOS_CARTAO.length;
    if (media > 0) {
      cartao = { pct: Math.round(media * 100) / 100, origem: "TAXAS", recebimentos: 0 };
    }
  }

  return {
    chave: chaveDoAparelho(professionalId),
    despesas,
    horario: { minutosSemana, minutosBloqueados, dias },
    ocupacaoReal,
    material: { porAtendimentoCents: materialPorAtendimento, itens: itensMaterial, semCusto },
    cartao,
    servicos,
  };
}
