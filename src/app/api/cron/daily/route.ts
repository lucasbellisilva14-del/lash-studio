/**
 * GET /api/cron/daily — resumo diário por push, uma notificação por profissional.
 *
 * Protegida por "Authorization: Bearer <CRON_SECRET>" — o Vercel Cron envia o
 * header automaticamente quando a env CRON_SECRET existe no projeto.
 * O horário do disparo é fixo em UTC no vercel.json (10:30 UTC = 07:30 em
 * Brasília); o conteúdo do resumo é sempre montado no fuso de cada profissional.
 */
import { addDays, addHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildMessageQueue } from "@/lib/domain/queue";
import { LASH_CYCLE_CATEGORIES } from "@/lib/constants";
import { diffLocalDays, formatTime, localDayKey, localDayRange } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { sendPushToProfessional } from "@/components/push/send";
import {
  getMessageProvider,
  messageProviderIsAutomatic,
} from "@/lib/providers/message";

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

type SummaryInput = {
  id: string;
  timezone: string;
  maintenanceNoticeDay: number;
  maintenanceLimitDays: number;
};

/**
 * Linhas do resumo do dia, da mais para a menos relevante.
 * Vazio = nada relevante E agenda vazia (não envia).
 */
async function buildSummaryLines(professional: SummaryInput, now: Date): Promise<string[]> {
  const tz = professional.timezone;
  const { start: todayStart, end: todayEnd } = localDayRange(now, tz);
  const todayKey = localDayKey(now, tz);

  const [todayAppointments, queue, pendingDeposits, clients, products] = await Promise.all([
    // Agenda de hoje (ativos)
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        startAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      },
      orderBy: { startAt: "asc" },
      select: { startAt: true },
    }),
    // Fila de mensagens do dia
    buildMessageQueue(professional.id, now),
    // Sinais pendentes nas próximas 48h
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        status: "PRE_AGENDADO",
        depositPaidAt: null,
        startAt: { gte: now, lte: addHours(now, 48) },
        OR: [{ depositRequired: true }, { depositCents: { gt: 0 } }],
      },
      select: { depositCents: true },
    }),
    // Clientes p/ aniversário de hoje + janela de manutenção
    prisma.client.findMany({
      where: { professionalId: professional.id },
      select: {
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
    // Estoque ativo (mínimo e validade avaliados abaixo)
    prisma.product.findMany({
      where: { professionalId: professional.id, active: true },
    }),
  ]);

  // Aniversariantes de hoje (birthDate guardada em UTC)
  const birthdays = clients.filter(
    (client) =>
      client.birthDate &&
      localDayKey(client.birthDate, "UTC").slice(5) === todayKey.slice(5),
  );

  // Clientes no período de manutenção, sem retorno agendado
  const maintenance = clients.filter((client) => {
    const lastLash = client.appointments.find((a) => a.status === "CONCLUIDO");
    if (!lastLash) return false;
    const hasFuture = client.appointments.some(
      (a) => a.status !== "CONCLUIDO" && a.startAt >= now,
    );
    if (hasFuture) return false;
    const daysSince = diffLocalDays(lastLash.startAt, now, tz);
    return (
      daysSince >= professional.maintenanceNoticeDay &&
      daysSince <= professional.maintenanceLimitDays
    );
  });

  // Alertas de estoque: abaixo do mínimo ou validade em até 7 dias
  let stockAlerts = 0;
  for (const product of products) {
    if (product.quantity < product.minQuantity) {
      stockAlerts += 1;
      continue;
    }
    const expiry =
      product.openedAt && product.shelfLifeDaysAfterOpen != null
        ? addDays(product.openedAt, product.shelfLifeDaysAfterOpen)
        : product.expiresAt;
    if (expiry && diffLocalDays(now, expiry, tz) <= 7) stockAlerts += 1;
  }

  const lines: string[] = [];

  const count = todayAppointments.length;
  if (count > 0) {
    const first = formatTime(todayAppointments[0].startAt, tz);
    lines.push(
      count === 1
        ? `1 atendimento hoje, às ${first}`
        : `${count} atendimentos hoje — o primeiro às ${first}`,
    );
  }

  if (pendingDeposits.length > 0) {
    const totalCents = pendingDeposits.reduce((sum, a) => sum + (a.depositCents ?? 0), 0);
    const valor = totalCents > 0 ? ` (${formatBRL(totalCents)})` : "";
    lines.push(
      `${pendingDeposits.length} ${plural(pendingDeposits.length, "sinal pendente", "sinais pendentes")}${valor} nas próximas 48h`,
    );
  }

  if (queue.length > 0) {
    lines.push(
      `${queue.length} ${plural(queue.length, "mensagem", "mensagens")} na fila para enviar`,
    );
  }

  if (birthdays.length === 1) lines.push(`Aniversário de ${birthdays[0].name} hoje 🎂`);
  else if (birthdays.length > 1) lines.push(`${birthdays.length} aniversariantes hoje 🎂`);

  if (maintenance.length === 1) {
    lines.push(`${maintenance[0].name} está no período de manutenção`);
  } else if (maintenance.length > 1) {
    lines.push(`${maintenance.length} clientes no período de manutenção`);
  }

  if (stockAlerts > 0) {
    lines.push(
      `${stockAlerts} ${plural(stockAlerts, "alerta", "alertas")} de estoque (mínimo/validade)`,
    );
  }

  // Nada relevante e agenda vazia → não envia nada hoje.
  if (lines.length === 0) return [];
  if (count === 0) lines.unshift("Agenda livre hoje");
  return lines;
}

/**
 * Janela de disparo: o cron roda a cada 15min (pinger externo) e envia
 * quando o horário local da profissional entrou na janela
 * [dailySummaryTime, dailySummaryTime + 20min). Dedup por dia local.
 */
function dentroDaJanela(nowLocalMin: number, alvo: string): boolean {
  const [h, m] = alvo.split(":").map(Number);
  const alvoMin = h * 60 + (m || 0);
  return nowLocalMin >= alvoMin && nowLocalMin < alvoMin + 20;
}

function minutosLocais(now: Date, tz: string): number {
  const [h, m] = formatTime(now, tz).split(":").map(Number);
  return h * 60 + m;
}

/** Envia a fila inteira via API de WhatsApp e registra cada mensagem. */
async function enviarFilaAutomatica(professionalId: string, now: Date): Promise<number> {
  const queue = await buildMessageQueue(professionalId, now);
  const provider = getMessageProvider();
  let enviadas = 0;
  for (const item of queue) {
    try {
      const prepared = await provider.send({ phone: item.client.phone, body: item.body });
      if (prepared.mode !== "SENT") break; // provider virou manual? aborta
      await prisma.messageLog.create({
        data: {
          professionalId,
          clientId: item.client.id,
          appointmentId: item.appointmentId,
          templateId: item.templateId,
          kind: item.kind,
          channel: "WHATSAPP",
          body: item.body,
          status: "ENVIADA",
          refDate: item.refDate,
          sentAt: new Date(),
        },
      });
      enviadas += 1;
    } catch (e) {
      console.error(`[cron] envio automático falhou (${professionalId}):`, e);
      break; // API fora do ar — tenta de novo no próximo tick, sem duplicar
    }
  }
  return enviadas;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const professionals = await prisma.professional.findMany({
    include: { _count: { select: { pushSubscriptions: true } } },
  });
  const waAutomatico = messageProviderIsAutomatic();

  let sent = 0;
  let waSent = 0;
  for (const professional of professionals) {
    const tz = professional.timezone;
    const todayKey = localDayKey(now, tz);
    const nowMin = minutosLocais(now, tz);
    if (!dentroDaJanela(nowMin, professional.dailySummaryTime)) continue;

    // ── Resumo por push, no horário escolhido por ELA ──
    if (
      professional._count.pushSubscriptions > 0 &&
      professional.dailySummarySentDay !== todayKey
    ) {
      try {
        // Marca antes de enviar: melhor perder 1 resumo do que duplicar.
        await prisma.professional.update({
          where: { id: professional.id },
          data: { dailySummarySentDay: todayKey },
        });
        const lines = await buildSummaryLines(professional, now);
        if (lines.length > 0) {
          const firstName = professional.name.trim().split(/\s+/)[0];
          const result = await sendPushToProfessional(professional.id, {
            title: `Bom dia, ${firstName}! ✨`,
            body: lines.slice(0, 3).join("\n"),
            url: "/",
          });
          if (result.sent > 0) sent += 1;
        }
      } catch {
        // Uma profissional com erro não derruba o resumo das demais.
      }
    }

    // ── WhatsApp automático: fila do dia sai sozinha (Evolution + opt-in) ──
    if (
      waAutomatico &&
      professional.autoSendMessages &&
      professional.autoSendSentDay !== todayKey
    ) {
      try {
        await prisma.professional.update({
          where: { id: professional.id },
          data: { autoSendSentDay: todayKey },
        });
        waSent += await enviarFilaAutomatica(professional.id, now);
      } catch (e) {
        console.error(`[cron] fila automática falhou (${professional.id}):`, e);
      }
    }
  }

  return Response.json({
    professionals: professionals.length,
    sent,
    waSent,
    waAutomatico,
  });
}
