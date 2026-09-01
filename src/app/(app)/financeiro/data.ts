/**
 * Financeiro — helpers de mês + materialização idempotente das despesas fixas.
 * Chamado só no servidor (page/server actions).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayKeyToUtcStart, formatWithPattern, localTimeOf, localToUtc } from "@/lib/dates";

/** "yyyy-MM" do instante no fuso da profissional. */
export function monthKeyOf(date: Date, tz: string): string {
  return formatWithPattern(date, "yyyy-MM", tz);
}

/** Desloca uma chave "yyyy-MM" em `delta` meses. */
export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/** Intervalo UTC [início, fim) do mês local "yyyy-MM". */
export function monthRange(key: string, tz: string): { start: Date; end: Date } {
  return {
    start: dayKeyToUtcStart(`${key}-01`, tz),
    end: dayKeyToUtcStart(`${shiftMonthKey(key, 1)}-01`, tz),
  };
}

/** Quantos dias tem o mês "yyyy-MM". */
function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Materializa no mês corrente as despesas FIXA_MENSAL do mês anterior:
 * para cada uma sem correspondente (mesma descrição + categoria) no mês atual
 * cujo dia já chegou, cria a cópia na data equivalente. Idempotente — verifica
 * existência antes de criar e deduplica dentro do próprio lote.
 */
export async function materializarDespesasFixas(
  professionalId: string,
  tz: string,
  agora = new Date(),
): Promise<void> {
  const mesAtual = monthKeyOf(agora, tz);
  const mesAnterior = shiftMonthKey(mesAtual, -1);
  const anterior = monthRange(mesAnterior, tz);
  const atual = monthRange(mesAtual, tz);

  const fixasDoMesAnterior = await prisma.transaction.findMany({
    where: {
      professionalId,
      type: "DESPESA",
      recurrence: "FIXA_MENSAL",
      date: { gte: anterior.start, lt: anterior.end },
    },
  });
  if (fixasDoMesAnterior.length === 0) return;

  const doMesAtual = await prisma.transaction.findMany({
    where: {
      professionalId,
      type: "DESPESA",
      date: { gte: atual.start, lt: atual.end },
    },
    select: { description: true, category: true },
  });

  const chave = (description: string, category: string | null) =>
    `${description}\u001f${category ?? ""}`;
  const existentes = new Set(doMesAtual.map((d) => chave(d.description, d.category)));
  const ultimoDia = daysInMonth(mesAtual);
  const diaHoje = Number(formatWithPattern(agora, "d", tz));

  const criacoes: Prisma.PrismaPromise<unknown>[] = [];
  for (const origem of fixasDoMesAnterior) {
    const k = chave(origem.description, origem.category);
    if (existentes.has(k)) continue;

    const diaOrigem = Number(formatWithPattern(origem.date, "d", tz));
    const dia = Math.min(diaOrigem, ultimoDia);
    if (dia > diaHoje) continue; // o dia dessa despesa ainda não chegou

    existentes.add(k); // não duplicar dentro do mesmo lote
    criacoes.push(
      prisma.transaction.create({
        data: {
          professionalId,
          type: "DESPESA",
          kind: "OUTRO",
          description: origem.description,
          category: origem.category,
          amountCents: origem.amountCents,
          method: origem.method,
          installments: origem.installments,
          feePct: origem.feePct,
          feeCents: origem.feeCents,
          netCents: origem.netCents,
          recurrence: "FIXA_MENSAL",
          date: localToUtc(
            `${mesAtual}-${String(dia).padStart(2, "0")}`,
            localTimeOf(origem.date, tz),
            tz,
          ),
        },
      }),
    );
  }

  if (criacoes.length > 0) await prisma.$transaction(criacoes);
}
