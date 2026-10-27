import "server-only";

/**
 * Coluna direita do PC (lg+): resumo do dia, próximas clientes, meta do mês
 * e atalhos. Some na agenda, que usa a largura toda.
 */
import Link from "next/link";
import type { Professional } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMessageQueueCached } from "@/lib/domain/queue";
import {
  dayKeyToUtcStart,
  formatTime,
  formatWithPattern,
  localDayRange,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { addHours, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  IconCalculator,
  IconCalendar,
  IconChat,
  IconChevronRight,
} from "@/components/ui/icons";
import { HideOnRoutes } from "./content-frame";

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
      take: 4,
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    getMessageQueueCached(professionalId),
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
    <div className="hidden lg:flex flex-col gap-4 w-72 xl:w-80 shrink-0 no-print">
      <Card className="p-5">
        <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">Hoje</h2>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <RailNumber value={hojeCount} label="horários" />
          <RailNumber value={queue.length} label="na fila" href="/mensagens" />
          <RailNumber value={sinaisPendentes} label="sinais" />
        </div>
      </Card>

      {/* Na home o dia já aparece (cartão escuro + agenda de hoje) */}
      <HideOnRoutes routes={["/"]}>
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">Próximas clientes</h2>
          <Link href="/agenda" className="text-[13px] font-semibold text-ink-soft hover:text-ink">
            Agenda
          </Link>
        </div>
        {proximos.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-soft">Nenhum horário nos próximos 7 dias.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {proximos.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <span className="w-12 shrink-0 text-center">
                  <span className="block text-[14px] font-bold tabular-nums tracking-[-0.02em] text-ink">
                    {formatTime(a.startAt, tz)}
                  </span>
                  <span className="block text-[11.5px] tabular-nums text-ink-faint">
                    {formatWithPattern(a.startAt, "dd/MM", tz)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">
                    {a.client.name}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{a.service.name}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </HideOnRoutes>

      <HideOnRoutes routes={["/financeiro"]}>
      <Card className="p-5">
        <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">
          Meta de {formatWithPattern(now, "MMMM", tz)}
        </h2>
        {goal ? (
          <>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <p className="text-[20px] font-bold tabular-nums tracking-[-0.03em] text-ink">
                {formatBRL(netCents)}
              </p>
              <p className="text-[12.5px] tabular-nums text-ink-soft">
                de {formatBRL(goal.revenueTargetCents)}
              </p>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${metaPct}%` }}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-soft">{metaPct}% da meta</p>
          </>
        ) : (
          <p className="mt-2 text-[13.5px] text-ink-soft">
            Sem meta para este mês.{" "}
            <Link href="/financeiro" className="font-semibold text-ink underline underline-offset-2">
              Definir meta
            </Link>
          </p>
        )}
      </Card>
      </HideOnRoutes>

      <Card className="overflow-hidden">
        <RailAction href="/mensagens" icon={<IconChat width={17} height={17} />}>
          Abrir a fila
        </RailAction>
        {/* Financeiro já tem o atalho no cabeçalho; Ferramentas é a própria tela */}
        <HideOnRoutes routes={["/financeiro", "/ferramentas"]}>
          <RailAction href="/ferramentas" icon={<IconCalculator width={17} height={17} />}>
            Calculadora de cobrança
          </RailAction>
        </HideOnRoutes>
        <RailAction href="/agenda/espera" icon={<IconCalendar width={17} height={17} />}>
          Lista de espera
        </RailAction>
      </Card>
    </div>
  );
}

function RailNumber({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <>
      <span className="block text-[20px] font-bold tabular-nums tracking-[-0.03em] text-ink">{value}</span>
      <span className="block text-[11.5px] font-medium text-ink-soft">{label}</span>
    </>
  );
  const cls = "rounded-[16px] bg-surface-sunken px-2 py-3 text-center";
  return href ? (
    <Link href={href} className={`${cls} hover:bg-accent-soft transition-colors`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
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
      className="flex items-center gap-3 border-b border-line px-5 py-3.5 text-[14px] font-semibold text-ink last:border-b-0 hover:bg-surface-muted transition-colors"
    >
      <span className="text-ink-soft">{icon}</span>
      <span className="grow">{children}</span>
      <IconChevronRight width={16} height={16} className="text-ink-faint" />
    </Link>
  );
}
