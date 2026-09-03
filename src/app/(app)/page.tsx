import { addDays, addHours } from "date-fns";
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildMessageQueue } from "@/lib/domain/queue";
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
import { OnboardingCard } from "@/components/home/onboarding-card";
import { HomeSection } from "@/components/home/section";
import { TodayAgenda, type TodayAgendaItem } from "@/components/home/today-agenda";
import { MessageQueueCard } from "@/components/home/message-queue-card";
import { AlertsCard, type HomeAlert } from "@/components/home/alerts-card";
import { MonthSummary } from "@/components/home/month-summary";
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

export default async function HomePage() {
  const professional = await requireProfessional();
  const professionalId = professional.id;
  const tz = professional.timezone;
  const now = new Date();

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
    monthRevenue,
    monthDoneCount,
    goal,
    game,
  ] = await Promise.all([
    // Agenda de hoje (cancelados ficam de fora)
    prisma.appointment.findMany({
      where: {
        professionalId,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO", "FALTOU"] },
      },
      orderBy: { startAt: "asc" },
      include: {
        client: {
          select: {
            name: true,
            anamnesisForm: { select: { hasContraindication: true } },
          },
        },
        service: { select: { name: true } },
      },
    }),
    // Fila de mensagens do dia
    buildMessageQueue(professionalId, now),
    // Sinais pendentes nas próximas 48h
    prisma.appointment.findMany({
      where: {
        professionalId,
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
      where: { professionalId },
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
          select: { status: true, startAt: true },
        },
      },
    }),
    // Estoque ativo (mínimos e validade de colas calculados abaixo)
    prisma.product.findMany({ where: { professionalId, active: true } }),
    // Faturamento líquido do mês
    prisma.transaction.aggregate({
      where: {
        professionalId,
        type: "RECEITA",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { netCents: true },
    }),
    // Atendimentos concluídos no mês
    prisma.appointment.count({
      where: {
        professionalId,
        status: "CONCLUIDO",
        startAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    // Meta do mês, se cadastrada
    prisma.goal.findUnique({
      where: { professionalId_month: { professionalId, month: monthKey } },
    }),
    // Nível, medalhas e desafios
    getGamification(professionalId, now),
  ]);

  // ── Saudação ──
  const hour = Number(formatWithPattern(now, "HH", tz));
  const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = professional.name.trim().split(/\s+/)[0];
  const dateLabel = capitalize(formatDateLong(now, tz));

  // ── Agenda de hoje + próximo compromisso ──
  const agendaHref = `/agenda?dia=${todayKey}`;
  const agendaItems: TodayAgendaItem[] = todayAppointments.map((appt) => ({
    id: appt.id,
    startAt: appt.startAt,
    endAt: appt.endAt,
    status: appt.status as AppointmentStatus,
    clientName: appt.client.name,
    serviceName: appt.service.name,
    hasContraindication: appt.client.anamnesisForm?.hasContraindication ?? false,
  }));

  const next = todayAppointments.find(
    (a) => (a.status === "PRE_AGENDADO" || a.status === "CONFIRMADO") && a.endAt > now,
  );
  let nextLabel: string | null = null;
  if (next) {
    const minutes = Math.ceil((next.startAt.getTime() - now.getTime()) / 60000);
    nextLabel = minutes <= 0 ? "Agora" : minutes <= 90 ? `Em ${minutes} min` : "Próximo";
  }

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

  // 2. Aniversariantes dos próximos 7 dias (a mensagem sai pela fila)
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

  // 3. Clientes chegando ao dia de manutenção (sem retorno agendado)
  for (const client of clientsForAlerts) {
    const lastLash = client.appointments.find((a) => a.status === "CONCLUIDO");
    const hasFuture = client.appointments.some(
      (a) => a.status !== "CONCLUIDO" && a.startAt >= now,
    );
    if (!lastLash || hasFuture) continue;
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

  // 4. Estoque: colas vencendo/vencidas e produtos abaixo do mínimo
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
      description: `${formatQty(p.quantity)} ${p.unit} em estoque — mínimo ${formatQty(p.minQuantity)}`,
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
  const netCents = monthRevenue._sum.netCents ?? 0;
  const monthLabel = formatWithPattern(now, "MMMM", tz);

  return (
    <div className="space-y-7">
      <Greeting
        greeting={greeting}
        firstName={firstName}
        dateLabel={dateLabel}
        studioName={professional.studioName}
        logoUrl={professional.logoUrl}
      />

      {!professional.onboardingDone ? <OnboardingCard /> : null}

      <GamificationHomeCard game={game} />

      {/* Desktop: duas colunas p/ preencher bem a tela; celular: fluxo único */}
      <div className="space-y-7 xl:space-y-0 xl:grid xl:grid-cols-2 xl:items-start xl:gap-7">
        <div className="space-y-7">
          <HomeSection title="Agenda de hoje" actionHref={agendaHref} actionLabel="Ver agenda">
            <TodayAgenda
              items={agendaItems}
              nextId={next?.id ?? null}
              nextLabel={nextLabel}
              tz={tz}
              agendaHref={agendaHref}
            />
          </HomeSection>

          <HomeSection title={`Resumo de ${monthLabel}`}>
            <MonthSummary
              netCents={netCents}
              doneCount={monthDoneCount}
              goal={goal ? { targetCents: goal.revenueTargetCents } : null}
            />
          </HomeSection>
        </div>

        <div className="space-y-7">
          <HomeSection title="Fila de mensagens">
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
        </div>
      </div>
    </div>
  );
}
