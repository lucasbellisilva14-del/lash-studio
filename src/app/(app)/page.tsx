import { addDays, addHours } from "date-fns";
import type { Product } from "@prisma/client";
import { requireProfessional, requireViewer, type Viewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { appointmentScope, clientScope } from "@/lib/team";
import { firstName as firstNameOf } from "@/lib/team-shared";
import { getMessageQueueForViewer } from "@/lib/domain/queue";
import {
  dayKeyToUtcStart,
  diffLocalDays,
  formatDate,
  formatDateLong,
  formatDateShort,
  formatWithPattern,
  localDayKey,
  localDayRange,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { LASH_CYCLE_CATEGORIES, type AppointmentStatus } from "@/lib/constants";
import { Greeting } from "@/components/home/greeting";
import { QuickActions } from "@/components/home/quick-actions";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { HomeFab } from "@/components/home/home-fab";
import { WeeklyRecapBanner } from "@/components/home/weekly-recap-banner";
import { localWeekday } from "@/lib/dates";
import { OnboardingCard } from "@/components/home/onboarding-card";
import { unidadeComPlural } from "@/components/estoque/types";
import { NextAppointmentCard } from "@/components/home/next-appointment";
import { HomeSection } from "@/components/home/section";
import { TodayAgenda, type TodayAgendaItem } from "@/components/home/today-agenda";
import { MessageQueueCard } from "@/components/home/message-queue-card";
import { AlertsCard, type HomeAlert } from "@/components/home/alerts-card";
import { MonthSummary } from "@/components/home/month-summary";
import { MyMonth } from "@/components/home/my-month";
import {
  getProDirectory,
  proView,
  withProView,
  type ProDirectory,
} from "@/components/home/pros";
import { getGamification } from "@/lib/domain/gamification";
import { GamificationHomeCard } from "@/components/gamificacao/home-card";

export const metadata = { title: "Meu dia" };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function formatQty(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString("pt-BR");
}

type MonthNumbers = {
  /** Receita líquida do mês: do estúdio (dona) ou dos atendimentos dela (funcionária). */
  netCents: number;
  doneCount: number;
  /** Só da funcionária: líquido × % de comissão congelado em cada agendamento. */
  commissionCents: number;
};

async function monthNumbers(
  viewer: Viewer,
  professionalId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<MonthNumbers> {
  const date = { gte: monthStart, lt: monthEnd };
  if (viewer.isOwner) {
    const [revenue, doneCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { professionalId, type: "RECEITA", date },
        _sum: { netCents: true },
      }),
      prisma.appointment.count({
        where: { professionalId, status: "CONCLUIDO", startAt: date },
      }),
    ]);
    return { netCents: revenue._sum.netCents ?? 0, doneCount, commissionCents: 0 };
  }

  // Receita dela = transações dos agendamentos dela (sinal + atendimento).
  const [received, doneCount] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        professionalId,
        type: "RECEITA",
        date,
        appointment: { is: { memberId: viewer.memberId } },
      },
      select: { netCents: true, appointment: { select: { commissionPct: true } } },
    }),
    prisma.appointment.count({
      where: { professionalId, memberId: viewer.memberId, status: "CONCLUIDO", startAt: date },
    }),
  ]);
  let netCents = 0;
  let commissionCents = 0;
  for (const t of received) {
    netCents += t.netCents;
    commissionCents += Math.round((t.netCents * (t.appointment?.commissionPct ?? 0)) / 100);
  }
  return { netCents, doneCount, commissionCents };
}

/**
 * Meu dia. A dona vê o estúdio inteiro (como sempre; com equipe, a agenda de
 * hoje diz quem atende cada horário). A funcionária vê só o dia dela: agenda,
 * fila, alertas dos horários dela e "Meu mês" — nada de números do estúdio,
 * onboarding, gamificação, resumo semanal ou estoque.
 */
export default async function HomePage() {
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const isOwner = viewer.isOwner;
  const professionalId = professional.id;
  const tz = professional.timezone;
  const now = new Date();
  const scope = appointmentScope(viewer);

  const { start: todayStart, end: todayEnd } = localDayRange(now, tz);
  const todayKey = localDayKey(now, tz);

  const monthKey = formatWithPattern(now, "yyyy-MM", tz);
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonthKey =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthStart = dayKeyToUtcStart(`${monthKey}-01`, tz);
  const monthEnd = dayKeyToUtcStart(`${nextMonthKey}-01`, tz);

  const [
    todayAppointments,
    queue,
    pendingDeposits,
    clientsForAlerts,
    products,
    monthData,
    goal,
    pros,
  ] = await Promise.all([
    // Agenda de hoje (cancelados ficam de fora); funcionária: só os horários dela
    prisma.appointment.findMany({
      where: {
        professionalId,
        ...scope,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO", "FALTOU"] },
      },
      orderBy: { startAt: "asc" },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            anamnesisForm: { select: { hasContraindication: true } },
          },
        },
        service: { select: { name: true } },
      },
    }),
    // Fila de mensagens do dia de quem está logada (memoizada por request)
    getMessageQueueForViewer(viewer),
    // Sinais pendentes nas próximas 48h
    prisma.appointment.findMany({
      where: {
        professionalId,
        ...scope,
        status: "PRE_AGENDADO",
        depositPaidAt: null,
        startAt: { gte: now, lte: addHours(now, 48) },
        OR: [{ depositRequired: true }, { depositCents: { gt: 0 } }],
      },
      orderBy: { startAt: "asc" },
      include: { client: { select: { name: true } } },
    }),
    // Clientes p/ aniversários da semana + janela de manutenção
    prisma.client.findMany({
      where: { professionalId, ...clientScope(viewer) },
      select: {
        id: true,
        name: true,
        birthDate: true,
        appointments: {
          where: {
            OR: [
              {
                status: "CONCLUIDO",
                service: { category: { in: [...LASH_CYCLE_CATEGORIES] } },
              },
              { status: { in: ["PRE_AGENDADO", "CONFIRMADO"] }, startAt: { gte: now } },
            ],
          },
          orderBy: { startAt: "desc" },
          select: { status: true, startAt: true, memberId: true },
        },
      },
    }),
    // Estoque ativo (mínimos e validade de colas calculados abaixo) — só da dona
    isOwner
      ? prisma.product.findMany({ where: { professionalId, active: true } })
      : Promise.resolve<Product[]>([]),
    // Faturamento líquido + concluídos do mês (do estúdio ou dela)
    monthNumbers(viewer, professionalId, monthStart, monthEnd),
    // Meta do mês, se cadastrada — só da dona
    isOwner
      ? prisma.goal.findUnique({
          where: { professionalId_month: { professionalId, month: monthKey } },
        })
      : Promise.resolve(null),
    // Quem atende cada horário (só aparece com equipe, para a dona)
    isOwner ? getProDirectory(professionalId) : Promise.resolve<ProDirectory | null>(null),
  ]);

  // Fora da rajada paralela: pool serverless tem poucas conexões e a
  // gamificação reaproveita a fila memoizada acima. Só a dona tem gamificação.
  const game = isOwner ? await getGamification(professionalId, now) : null;

  // ── Saudação ──
  const hour = Number(formatWithPattern(now, "HH", tz));
  const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = firstNameOf(isOwner ? professional.name : viewer.name);
  const dateLabel = capitalize(formatDateLong(now, tz));

  // ── Agenda de hoje + próximo compromisso ──
  // Com equipe, a dona vê quem atende cada horário; a funcionária só vê os dela.
  const team = pros?.hasTeam ? pros : null;
  const agendaHref = `/agenda?dia=${todayKey}`;
  const agendaItems: TodayAgendaItem[] = todayAppointments.map((appt) => ({
    id: appt.id,
    startAt: appt.startAt,
    endAt: appt.endAt,
    status: appt.status as AppointmentStatus,
    clientName: appt.client.name,
    serviceName: appt.service.name,
    hasContraindication: appt.client.anamnesisForm?.hasContraindication ?? false,
    pro: team ? proView(team.of(appt.memberId), viewer.memberId) : null,
  }));

  const next = todayAppointments.find(
    (a) => (a.status === "PRE_AGENDADO" || a.status === "CONFIRMADO") && a.endAt > now,
  );
  let nextLabel: string | null = null;
  if (next) {
    const minutes = Math.ceil((next.startAt.getTime() - now.getTime()) / 60000);
    nextLabel = minutes <= 0 ? "Agora" : minutes <= 90 ? `Em ${minutes} min` : "Próximo";
  }
  const nextProLabel =
    team && next && next.memberId !== viewer.memberId
      ? withProView(team.of(next.memberId), viewer.memberId).label
      : null;

  // ── Alertas ──
  const alerts: HomeAlert[] = [];

  // 1. Sinais pendentes (próximas 48h)
  for (const appt of pendingDeposits) {
    alerts.push({
      key: `sinal:${appt.id}`,
      icon: "deposit",
      tone: "warning",
      title: appt.depositCents
        ? `Sinal de ${formatBRL(appt.depositCents)} pendente`
        : "Sinal pendente",
      description: `${appt.client.name} — ${formatWithPattern(appt.startAt, "dd/MM 'às' HH:mm", tz)}`,
      href: `/agenda?dia=${localDayKey(appt.startAt, tz)}`,
    });
  }

  // 2. Aniversariantes dos próximos 7 dias (a mensagem sai pela fila da dona)
  if (isOwner) {
    const weekDayKeys = Array.from({ length: 7 }, (_, i) => localDayKey(addDays(now, i), tz));
    const birthdayAlerts: { idx: number; alert: HomeAlert }[] = [];
    for (const client of clientsForAlerts) {
      if (!client.birthDate) continue;
      const monthDay = localDayKey(client.birthDate, "UTC").slice(5); // "MM-dd"
      const idx = weekDayKeys.findIndex((key) => key.slice(5) === monthDay);
      if (idx < 0) continue;
      const when =
        idx === 0 ? "Hoje" : idx === 1 ? "Amanhã" : capitalize(formatDateShort(addDays(now, idx), tz));
      birthdayAlerts.push({
        idx,
        alert: {
          key: `aniversario:${client.id}`,
          icon: "birthday",
          tone: "accent",
          title: `Aniversário de ${client.name}`,
          description: `${when} — parabenize pela fila de mensagens`,
          href: "/mensagens",
        },
      });
    }
    birthdayAlerts.sort((a, b) => a.idx - b.idx);
    alerts.push(...birthdayAlerts.map((b) => b.alert));
  }

  // 3. Clientes chegando ao dia de manutenção (sem retorno agendado).
  // Funcionária: só quando o último atendimento de cílios foi com ela (o
  // aviso de manutenção cai na fila de quem fez o atendimento).
  for (const client of clientsForAlerts) {
    const lastLash = client.appointments.find((a) => a.status === "CONCLUIDO");
    const hasFuture = client.appointments.some(
      (a) => a.status !== "CONCLUIDO" && a.startAt >= now,
    );
    if (!lastLash || hasFuture) continue;
    if (!isOwner && lastLash.memberId !== viewer.memberId) continue;
    const daysSince = diffLocalDays(lastLash.startAt, now, tz);
    if (
      daysSince >= professional.maintenanceNoticeDay &&
      daysSince <= professional.maintenanceLimitDays
    ) {
      alerts.push({
        key: `manutencao:${client.id}`,
        icon: "maintenance",
        tone: "accent",
        title: `${client.name} — dia ${daysSince} do ciclo`,
        description: `Manutenção vale até o dia ${professional.maintenanceLimitDays}, sem retorno agendado`,
        href: `/clientes/${client.id}`,
      });
    }
  }

  // 4. Estoque: colas vencendo/vencidas e produtos abaixo do mínimo (só a dona)
  for (const product of products) {
    if (!product.openedAt || product.shelfLifeDaysAfterOpen == null) continue;
    const expiresAt = addDays(product.openedAt, product.shelfLifeDaysAfterOpen);
    const daysLeft = diffLocalDays(now, expiresAt, tz);
    if (daysLeft > 7) continue;
    alerts.push({
      key: `validade:${product.id}`,
      icon: "stock",
      tone: daysLeft <= 0 ? "danger" : "warning",
      title:
        daysLeft < 0
          ? `${product.name} vencida`
          : daysLeft === 0
            ? `${product.name} vence hoje`
            : `${product.name} vence em ${daysLeft} ${plural(daysLeft, "dia", "dias")}`,
      description: `Aberta em ${formatDate(product.openedAt, tz)}`,
      href: "/estoque",
    });
  }

  const lowStock = products.filter((p) => p.quantity < p.minQuantity);
  if (lowStock.length === 1) {
    const p = lowStock[0];
    alerts.push({
      key: `estoque:${p.id}`,
      icon: "stock",
      tone: "warning",
      title: `${p.name} abaixo do mínimo`,
      description: `${formatQty(p.quantity)} ${unidadeComPlural(p.unit, p.quantity)} em estoque — mínimo ${formatQty(p.minQuantity)}`,
      href: "/estoque",
    });
  } else if (lowStock.length > 1) {
    const names = lowStock.slice(0, 3).map((p) => p.name);
    alerts.push({
      key: "estoque:baixo",
      icon: "stock",
      tone: "warning",
      title: `${lowStock.length} produtos abaixo do mínimo`,
      description: names.join(", ") + (lowStock.length > 3 ? "…" : ""),
      href: "/estoque",
    });
  }

  // ── Resumo do mês ──
  const monthLabel = formatWithPattern(now, "MMMM", tz);

  return (
    <div className="space-y-6 lg:space-y-7">
      <Greeting
        greeting={greeting}
        firstName={firstName}
        dateLabel={dateLabel}
        studioName={professional.studioName}
        logoUrl={professional.logoUrl}
      />

      {next ? (
        <NextAppointmentCard
          startAt={next.startAt}
          endAt={next.endAt}
          clientName={next.client.name}
          clientPhone={next.client.phone}
          serviceName={next.service.name}
          hasContraindication={next.client.anamnesisForm?.hasContraindication ?? false}
          label={nextLabel}
          tz={tz}
          agendaHref={agendaHref}
          proLabel={nextProLabel}
        />
      ) : null}

      <QuickActions />

      <InstallPrompt />

      {isOwner && !professional.onboardingDone ? <OnboardingCard /> : null}

      {/* O trabalho do dia primeiro; resumo, recap e nível depois. */}
      <HomeSection title="Agenda de hoje" actionHref={agendaHref} actionLabel="Ver agenda">
        <TodayAgenda
          items={agendaItems}
          nextId={next?.id ?? null}
          nextLabel={nextLabel}
          tz={tz}
          agendaHref={agendaHref}
          showWaitlist={isOwner}
        />
      </HomeSection>

      <HomeSection title="Fila de mensagens" actionHref="/mensagens" actionLabel="Abrir a fila">
        <MessageQueueCard
          total={queue.length}
          items={queue.slice(0, 3).map((item) => ({
            key: item.key,
            clientName: item.client.name,
            kindLabel: item.kindLabel,
          }))}
        />
      </HomeSection>

      {alerts.length > 0 ? (
        <HomeSection title="Precisa de atenção">
          <AlertsCard alerts={alerts} />
        </HomeSection>
      ) : null}

      {isOwner ? (
        <HomeSection title={`Resumo de ${monthLabel}`}>
          <MonthSummary
            netCents={monthData.netCents}
            doneCount={monthData.doneCount}
            goal={goal ? { targetCents: goal.revenueTargetCents } : null}
          />
        </HomeSection>
      ) : (
        <HomeSection title="Meu mês" actionHref="/financeiro" actionLabel="Ver meus números">
          <MyMonth
            receivedCents={monthData.netCents}
            doneCount={monthData.doneCount}
            commissionCents={monthData.commissionCents}
            monthLabel={monthLabel}
          />
        </HomeSection>
      )}

      {/* Dom/seg: convite pro resumo comemorativo da semana (resumo do estúdio) */}
      {isOwner && [0, 1].includes(localWeekday(now, tz)) ? <WeeklyRecapBanner /> : null}

      {game ? <GamificationHomeCard game={game} /> : null}

      <HomeFab showExpense={isOwner} />
    </div>
  );
}
