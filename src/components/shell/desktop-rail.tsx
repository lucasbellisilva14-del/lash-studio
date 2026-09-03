import "server-only";

/**
 * Coluna direita do desktop (lg+): visão de gerenciamento sempre à mão —
 * resumo do dia, próximas clientes, meta do mês e ações rápidas.
 */
import Link from "next/link";
import type { Professional } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildMessageQueue } from "@/lib/domain/queue";
import {
  dayKeyToUtcStart,
  formatTime,
  formatWithPattern,
  localDayKey,
  localDayRange,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { addHours, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  IconCalendar,
  IconChat,
  IconPlus,
  IconUsers,
} from "@/components/ui/icons";

export async function DesktopRail({ professional }: { professional: Professional }) {
  const professionalId = professional.id;
  const tz = professional.timezone;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = localDayRange(now, tz);

  const monthKey = formatWithPattern(now, "yyyy-MM", tz);
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonthKey =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthStart = dayKeyToUtcStart(`${monthKey}-01`, tz);
  const monthEnd = dayKeyToUtcStart(`${nextMonthKey}-01`, tz);

  const [hojeCount, proximos, queue, sinaisPendentes, receita, goal] = await Promise.all([
    prisma.appointment.count({
      where: {
        professionalId,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO"] },
      },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        startAt: { gte: now, lt: addDays(now, 7) },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      },
      orderBy: { startAt: "asc" },
      take: 3,
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    buildMessageQueue(professionalId, now),
    prisma.appointment.count({
      where: {
        professionalId,
        status: "PRE_AGENDADO",
        depositPaidAt: null,
        startAt: { gte: now, lte: addHours(now, 48) },
      },
    }),
    prisma.transaction.aggregate({
      where: { professionalId, type: "RECEITA", date: { gte: monthStart, lt: monthEnd } },
      _sum: { netCents: true },
    }),
    prisma.goal.findUnique({
      where: { professionalId_month: { professionalId, month: monthKey } },
    }),
  ]);

  const netCents = receita._sum.netCents ?? 0;
  const metaPct = goal
    ? Math.min(100, Math.round((netCents / goal.revenueTargetCents) * 100))
    : null;

  return (
    <div className="hidden lg:flex flex-col gap-5 w-72 xl:w-80 shrink-0">
      {/* Resumo do dia */}
      <Card className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-3">
          Hoje em resumo
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface-sunken/70 py-3">
            <p className="font-display text-xl font-semibold text-ink">{hojeCount}</p>
            <p className="text-[11px] text-ink-soft">atendim.</p>
          </div>
          <div className="rounded-2xl bg-surface-sunken/70 py-3">
            <p className="font-display text-xl font-semibold text-ink">{queue.length}</p>
            <p className="text-[11px] text-ink-soft">na fila</p>
          </div>
          <div className="rounded-2xl bg-surface-sunken/70 py-3">
            <p className="font-display text-xl font-semibold text-ink">{sinaisPendentes}</p>
            <p className="text-[11px] text-ink-soft">sinais</p>
          </div>
        </div>
      </Card>

      {/* Próximas clientes */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between mb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Próximas clientes
          </p>
          <Link href="/agenda" className="text-xs font-medium text-accent-strong hover:underline">
            Agenda →
          </Link>
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-ink-faint py-2">Nenhum horário nos próximos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {proximos.map((a) => (
              <li key={a.id} className="py-2.5 flex items-center gap-3">
                <span className="shrink-0 rounded-xl bg-accent-soft text-accent-strong text-[11px] font-semibold px-2 py-1.5 text-center leading-tight">
                  {formatWithPattern(a.startAt, "dd/MM", tz)}
                  <br />
                  {formatTime(a.startAt, tz)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">
                    {a.client.name}
                  </span>
                  <span className="block text-xs text-ink-soft truncate">
                    {a.service.name}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Meta do mês */}
      <Card className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2">
          Meta de {formatWithPattern(now, "MMMM", tz)}
        </p>
        {goal ? (
          <>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="font-display text-lg font-semibold text-ink">
                {formatBRL(netCents)}
              </p>
              <p className="text-xs text-ink-soft">de {formatBRL(goal.revenueTargetCents)}</p>
            </div>
            <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-gradient transition-[width] duration-700"
                style={{ width: `${metaPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{metaPct}% da meta 💗</p>
          </>
        ) : (
          <Link
            href="/financeiro"
            className="block text-sm text-accent-strong font-medium hover:underline"
          >
            Definir meta do mês →
          </Link>
        )}
      </Card>

      {/* Ações rápidas */}
      <Card className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2.5">
          Ações rápidas
        </p>
        <div className="space-y-2">
          <RailAction href="/agenda?novo=1" icon={<IconPlus width={16} height={16} />}>
            Novo agendamento
          </RailAction>
          <RailAction href="/mensagens" icon={<IconChat width={16} height={16} />}>
            Abrir fila de mensagens
          </RailAction>
          <RailAction href="/clientes" icon={<IconUsers width={16} height={16} />}>
            Ver clientes
          </RailAction>
          <RailAction href="/agenda/espera" icon={<IconCalendar width={16} height={16} />}>
            Lista de espera
          </RailAction>
        </div>
      </Card>
    </div>
  );
}

function RailAction({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink hover:bg-accent-soft/60 hover:text-accent-strong transition-colors"
    >
      <span className="text-accent-strong">{icon}</span>
      {children}
    </Link>
  );
}
