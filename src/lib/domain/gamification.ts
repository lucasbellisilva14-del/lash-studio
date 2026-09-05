/**
 * Gamificação do estúdio: XP, nível, conquistas e desafios da semana.
 * Tudo DERIVADO dos dados reais (atendimentos, mensagens, metas...) —
 * nada é persistido, então nunca dessincroniza.
 */
import { prisma } from "@/lib/prisma";
import { LASH_CYCLE_CATEGORIES } from "@/lib/constants";
import { dayKeyToUtcStart, diffLocalDays, localDayKey } from "@/lib/dates";
import { getMessageQueueCached } from "@/lib/domain/queue";
import { addHours } from "date-fns";

export type LevelInfo = {
  level: number;
  name: string;
  emoji: string;
  xp: number;
  /** XP dentro do nível atual e quanto falta p/ o próximo (null no nível máximo). */
  xpIntoLevel: number;
  xpForNext: number | null;
  progress: number; // 0-1 até o próximo nível
};

export type Achievement = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  current: number;
  target: number;
  progress: number; // 0-1
};

export type WeeklyChallenge = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  current: number;
  target: number;
  done: boolean;
  progress: number;
  xpLabel: string;
};

export type Gamification = {
  level: LevelInfo;
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  /** Conquista desbloqueada mais "avançada" (destaque da home). */
  highlight: Achievement | null;
  weekly: WeeklyChallenge[];
};

const LEVELS: Array<{ minXp: number; name: string; emoji: string }> = [
  { minXp: 0, name: "Aprendiz de Cílios", emoji: "🌱" },
  { minXp: 150, name: "Lash Artist", emoji: "✨" },
  { minXp: 400, name: "Fada dos Cílios", emoji: "🧚" },
  { minXp: 900, name: "Volume Queen", emoji: "💎" },
  { minXp: 1800, name: "Lash Queen", emoji: "👑" },
  { minXp: 3500, name: "Lenda dos Cílios", emoji: "🌟" },
];

function computeLevel(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const xpIntoLevel = xp - current.minXp;
  const xpForNext = next ? next.minXp - current.minXp : null;
  return {
    level: index + 1,
    name: current.name,
    emoji: current.emoji,
    xp,
    xpIntoLevel,
    xpForNext,
    progress: xpForNext ? Math.min(1, xpIntoLevel / xpForNext) : 1,
  };
}

function achievement(
  key: string,
  emoji: string,
  title: string,
  description: string,
  current: number,
  target: number,
): Achievement {
  return {
    key,
    emoji,
    title,
    description,
    current: Math.min(current, target),
    target,
    unlocked: current >= target,
    progress: Math.min(1, current / target),
  };
}

export async function getGamification(
  professionalId: string,
  now = new Date(),
): Promise<Gamification> {
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
  });
  const tz = professional.timezone;
  const todayKey = localDayKey(now, tz);
  const todayStart = dayKeyToUtcStart(todayKey, tz);

  const [
    clientCount,
    doneCount,
    sentCount,
    resgateSentCount,
    photoCount,
    anamnesisCount,
    depositsPaidCount,
    goals,
    revenueByGoalMonths,
    sentToday,
    clientsForRisk,
    pendingDeposits,
    queue,
  ] = await Promise.all([
    prisma.client.count({ where: { professionalId } }),
    prisma.appointment.count({ where: { professionalId, status: "CONCLUIDO" } }),
    prisma.messageLog.count({ where: { professionalId, status: "ENVIADA" } }),
    prisma.messageLog.count({
      where: { professionalId, status: "ENVIADA", kind: { startsWith: "RESGATE" } },
    }),
    prisma.photo.count({ where: { professionalId } }),
    prisma.anamnesisForm.count({ where: { professionalId } }),
    prisma.appointment.count({ where: { professionalId, depositPaidAt: { not: null } } }),
    prisma.goal.findMany({ where: { professionalId } }),
    prisma.transaction.findMany({
      where: { professionalId, type: "RECEITA" },
      select: { netCents: true, date: true },
    }),
    prisma.messageLog.count({
      where: { professionalId, status: "ENVIADA", sentAt: { gte: todayStart } },
    }),
    prisma.client.findMany({
      where: { professionalId },
      select: {
        id: true,
        anamnesisForm: { select: { id: true } },
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
    prisma.appointment.count({
      where: {
        professionalId,
        status: "PRE_AGENDADO",
        depositPaidAt: null,
        startAt: { gte: now, lte: addHours(now, 48) },
      },
    }),
    getMessageQueueCached(professionalId),
  ]);

  // Metas batidas: receita líquida do mês ≥ alvo da meta
  const revenueByMonth = new Map<string, number>();
  for (const t of revenueByGoalMonths) {
    const key = localDayKey(t.date, tz).slice(0, 7);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + t.netCents);
  }
  const goalsAchieved = goals.filter(
    (g) => (revenueByMonth.get(g.month) ?? 0) >= g.revenueTargetCents,
  ).length;

  // ── XP e nível ──
  const xp =
    doneCount * 20 +
    clientCount * 10 +
    anamnesisCount * 15 +
    Math.min(sentCount, 500) * 2 +
    photoCount * 5 +
    depositsPaidCount * 5 +
    goalsAchieved * 150;
  const level = computeLevel(xp);

  // ── Conquistas ──
  const filaZerada = queue.length === 0 ? 1 : 0;
  const achievements: Achievement[] = [
    achievement("primeira_cliente", "🤝", "Primeira cliente", "Cadastre sua primeira cliente", clientCount, 1),
    achievement("clientela", "💕", "Clientela querida", "10 clientes no seu CRM", clientCount, 10),
    achievement("estudio_estrela", "🌟", "Estúdio estrela", "25 clientes no seu CRM", clientCount, 25),
    achievement("primeiro_olhar", "🦋", "Primeiro olhar", "Conclua seu primeiro atendimento", doneCount, 1),
    achievement("maos_de_fada", "🪄", "Mãos de fada", "25 atendimentos concluídos", doneCount, 25),
    achievement("clube_das_100", "💯", "Clube das 100", "100 atendimentos concluídos", doneCount, 100),
    achievement("comunicadora", "💬", "Comunicadora", "50 mensagens enviadas pela fila", sentCount, 50),
    achievement("resgatadora", "🎯", "Resgatadora", "5 clientes chamadas de volta", resgateSentCount, 5),
    achievement("meta_batida", "🏆", "Meta batida", "Feche um mês com a meta atingida", goalsAchieved, 1),
    achievement("antes_e_depois", "📸", "Antes & depois", "10 fotos de atendimento registradas", photoCount, 10),
    achievement("tudo_documentado", "🛡️", "Tudo documentado", "5 anamneses preenchidas e assinadas", anamnesisCount, 5),
    achievement("sinal_na_conta", "⚡", "Sinal na conta", "5 sinais recebidos antecipado", depositsPaidCount, 5),
    achievement("fila_em_dia", "💗", "Fila em dia", "Zere a fila de mensagens de hoje", filaZerada, 1),
  ];
  const unlocked = achievements.filter((a) => a.unlocked);
  const highlight =
    unlocked.length > 0
      ? unlocked.reduce((best, a) => (a.target >= best.target ? a : best))
      : null;

  // ── Desafios da semana (dados vivos) ──
  const anamnesesPendentes = clientsForRisk.filter((c) => !c.anamnesisForm).length;
  const emRiscoSemRetorno = clientsForRisk.filter((c) => {
    const lastDone = c.appointments.find((a) => a.status === "CONCLUIDO");
    if (!lastDone) return false;
    const hasFuture = c.appointments.some((a) => a.status !== "CONCLUIDO" && a.startAt >= now);
    const days = diffLocalDays(lastDone.startAt, now, tz);
    return !hasFuture && days > professional.maintenanceLimitDays;
  }).length;

  const weekly: WeeklyChallenge[] = [
    {
      key: "fila",
      emoji: "💌",
      title: "Zere a fila de mensagens",
      description:
        queue.length === 0
          ? "Feito! Nenhuma mensagem pendente hoje."
          : `${queue.length} mensagem${queue.length === 1 ? "" : "s"} esperando para sair`,
      current: sentToday,
      target: sentToday + queue.length,
      done: queue.length === 0,
      progress: sentToday + queue.length === 0 ? 1 : sentToday / (sentToday + queue.length),
      xpLabel: "+2 XP por mensagem",
    },
    {
      key: "sinais",
      emoji: "⚡",
      title: "Confirme os sinais pendentes",
      description:
        pendingDeposits === 0
          ? "Nenhum sinal pendente nas próximas 48h."
          : `${pendingDeposits} sinal${pendingDeposits === 1 ? "" : "s"} aguardando confirmação`,
      current: pendingDeposits === 0 ? 1 : 0,
      target: 1,
      done: pendingDeposits === 0,
      progress: pendingDeposits === 0 ? 1 : 0,
      xpLabel: "+5 XP por sinal",
    },
    {
      key: "anamneses",
      emoji: "📋",
      title: "Anamneses em dia",
      description:
        anamnesesPendentes === 0
          ? "Todas as clientes com anamnese preenchida!"
          : `${anamnesesPendentes} cliente${anamnesesPendentes === 1 ? "" : "s"} sem anamnese`,
      current: clientCount - anamnesesPendentes,
      target: Math.max(1, clientCount),
      done: anamnesesPendentes === 0 && clientCount > 0,
      progress: clientCount === 0 ? 0 : (clientCount - anamnesesPendentes) / clientCount,
      xpLabel: "+15 XP por anamnese",
    },
    {
      key: "reconquista",
      emoji: "🎯",
      title: "Reconquiste clientes",
      description:
        emRiscoSemRetorno === 0
          ? "Nenhuma cliente vencida sem retorno. Arraso!"
          : `${emRiscoSemRetorno} cliente${emRiscoSemRetorno === 1 ? "" : "s"} passou do prazo sem retorno marcado`,
      current: emRiscoSemRetorno === 0 ? 1 : 0,
      target: 1,
      done: emRiscoSemRetorno === 0,
      progress: emRiscoSemRetorno === 0 ? 1 : 0,
      xpLabel: "agende o retorno delas",
    },
  ];

  return {
    level,
    achievements,
    unlockedCount: unlocked.length,
    totalCount: achievements.length,
    highlight,
    weekly,
  };
}
