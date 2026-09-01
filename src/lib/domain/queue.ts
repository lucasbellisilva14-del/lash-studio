/**
 * Fila do dia: todas as mensagens de WhatsApp que devem sair hoje.
 * Cada item já vem com o texto renderizado e o link wa.me pronto.
 * Dedup: MessageLog (kind + appointmentId/refDate) marca o que já saiu.
 */
import { prisma } from "@/lib/prisma";
import { LASH_CYCLE_CATEGORIES, type TemplateKind } from "@/lib/constants";
import { addDays } from "date-fns";
import { dayKeyToUtcStart, diffLocalDays, localDayKey } from "@/lib/dates";
import { renderTemplate } from "@/lib/domain/templates";
import { getMessageProvider } from "@/lib/providers/message";
import { buildPixPayload } from "@/lib/pix";

export type QueueItem = {
  /** Chave sintética estável do item (para dedup/ações). */
  key: string;
  kind: TemplateKind;
  kindLabel: string;
  client: { id: string; name: string; phone: string };
  appointmentId: string | null;
  templateId: string;
  body: string;
  /** Link wa.me pronto (modo LINK) — null se o provider enviar sozinho. */
  waUrl: string | null;
  /** Âncora de dedup (gravada no MessageLog.refDate ao enviar). */
  refDate: Date;
};

const KIND_LABELS: Record<TemplateKind, string> = {
  CONFIRMACAO: "Confirmação",
  LEMBRETE_24H: "Lembrete 24h",
  POS_APLICACAO: "Pós-aplicação",
  MANUTENCAO: "Manutenção",
  ANIVERSARIO: "Aniversário",
  RESGATE_45: "Resgate 45d",
  RESGATE_60: "Resgate 60d",
  RESGATE_90: "Resgate 90d",
};

export async function buildMessageQueue(
  professionalId: string,
  now = new Date(),
): Promise<QueueItem[]> {
  const professional = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
  });
  const tz = professional.timezone;
  const todayKey = localDayKey(now, tz);
  const todayStart = dayKeyToUtcStart(todayKey, tz);
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterTomorrowStart = addDays(todayStart, 2);

  const templates = await prisma.messageTemplate.findMany({
    where: { professionalId, active: true },
  });
  const templateByKind = new Map(templates.map((t) => [t.kind as TemplateKind, t]));

  const items: QueueItem[] = [];
  const provider = getMessageProvider();

  const baseCtx = {
    addressLine: professional.addressLine,
    mapsUrl: professional.mapsUrl,
    pixKey: professional.pixKey,
    studioName: professional.studioName,
    timezone: tz,
  };

  async function push(params: {
    kind: TemplateKind;
    client: { id: string; name: string; phone: string };
    appointmentId?: string | null;
    refDate: Date;
    ctx: Parameters<typeof renderTemplate>[1];
  }) {
    const template = templateByKind.get(params.kind);
    if (!template) return;
    const ctx = { ...baseCtx, ...params.ctx };
    // Sinal com chave Pix cadastrada → código copia-e-cola pronto na mensagem.
    if (ctx.depositCents && professional.pixKey && !ctx.pixCopiaECola) {
      ctx.pixCopiaECola = buildPixPayload({
        pixKey: professional.pixKey,
        merchantName: professional.studioName,
        amountCents: ctx.depositCents,
      });
    }
    const body = renderTemplate(template.body, ctx, { dropEmptyLines: true });
    const prepared = await provider.send({ phone: params.client.phone, body });
    items.push({
      key: `${params.kind}:${params.client.id}:${params.appointmentId ?? params.refDate.toISOString()}`,
      kind: params.kind,
      kindLabel: KIND_LABELS[params.kind],
      client: params.client,
      appointmentId: params.appointmentId ?? null,
      templateId: template.id,
      body,
      waUrl: prepared.mode === "LINK" ? prepared.url : null,
      refDate: params.refDate,
    });
  }

  // ── 1. Confirmações: agendamentos futuros ainda sem mensagem de confirmação ──
  const upcoming = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      startAt: { gte: now, lte: addDays(now, 30) },
      messageLogs: { none: { kind: "CONFIRMACAO", status: "ENVIADA" } },
    },
    include: { client: true, service: true },
    orderBy: { startAt: "asc" },
  });
  for (const appt of upcoming) {
    await push({
      kind: "CONFIRMACAO",
      client: appt.client,
      appointmentId: appt.id,
      refDate: appt.startAt,
      ctx: {
        clientName: appt.client.name,
        startAt: appt.startAt,
        serviceName: appt.service.name,
        priceCents: appt.priceCents,
        depositCents: appt.depositCents,
      },
    });
  }

  // ── 2. Lembrete 24h: agendamentos de amanhã ──
  const tomorrow = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      startAt: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
      messageLogs: { none: { kind: "LEMBRETE_24H", status: "ENVIADA" } },
    },
    include: { client: true, service: true },
    orderBy: { startAt: "asc" },
  });
  for (const appt of tomorrow) {
    await push({
      kind: "LEMBRETE_24H",
      client: appt.client,
      appointmentId: appt.id,
      refDate: appt.startAt,
      ctx: {
        clientName: appt.client.name,
        startAt: appt.startAt,
        serviceName: appt.service.name,
        priceCents: appt.priceCents,
      },
    });
  }

  // ── 3. Pós-aplicação: concluídos hoje/ontem (aplicação e lash lifting) ──
  const recentDone = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: "CONCLUIDO",
      startAt: { gte: addDays(todayStart, -1), lt: tomorrowStart },
      service: { category: { in: ["APLICACAO", "LASH_LIFTING"] } },
      messageLogs: { none: { kind: "POS_APLICACAO", status: "ENVIADA" } },
    },
    include: { client: true, service: true },
  });
  for (const appt of recentDone) {
    await push({
      kind: "POS_APLICACAO",
      client: appt.client,
      appointmentId: appt.id,
      refDate: appt.startAt,
      ctx: { clientName: appt.client.name, serviceName: appt.service.name },
    });
  }

  // ── 4-6. Por cliente: manutenção, aniversário, resgate ──
  const clients = await prisma.client.findMany({
    where: { professionalId },
    include: {
      appointments: {
        where: {
          OR: [
            { status: "CONCLUIDO", service: { category: { in: [...LASH_CYCLE_CATEGORIES] } } },
            { status: { in: ["PRE_AGENDADO", "CONFIRMADO"] }, startAt: { gte: now } },
          ],
        },
        include: { service: true },
        orderBy: { startAt: "desc" },
      },
      messageLogs: {
        where: {
          status: "ENVIADA",
          kind: { in: ["MANUTENCAO", "ANIVERSARIO", "RESGATE_45", "RESGATE_60", "RESGATE_90"] },
        },
      },
    },
  });

  for (const client of clients) {
    const lastLash = client.appointments.find((a) => a.status === "CONCLUIDO") ?? null;
    const hasFuture = client.appointments.some(
      (a) => a.status !== "CONCLUIDO" && a.startAt >= now,
    );
    const daysSince = lastLash ? diffLocalDays(lastLash.startAt, now, tz) : null;

    // Aniversário (independe do ciclo)
    if (client.birthDate) {
      const birthKey = localDayKey(client.birthDate, "UTC").slice(5); // "MM-dd"
      if (todayKey.slice(5) === birthKey) {
        const alreadySent = client.messageLogs.some(
          (log) =>
            log.kind === "ANIVERSARIO" &&
            log.refDate &&
            localDayKey(log.refDate, tz).slice(0, 4) === todayKey.slice(0, 4),
        );
        if (!alreadySent) {
          await push({
            kind: "ANIVERSARIO",
            client,
            refDate: todayStart,
            ctx: { clientName: client.name },
          });
        }
      }
    }

    if (!lastLash || daysSince == null) continue;
    const cycleAnchor = lastLash.startAt;
    const sentInCycle = (kind: string) =>
      client.messageLogs.some(
        (log) => log.kind === kind && log.refDate?.getTime() === cycleAnchor.getTime(),
      );

    // Aviso de manutenção: do dia configurado do ciclo até o prazo-limite
    if (
      !hasFuture &&
      daysSince >= professional.maintenanceNoticeDay &&
      daysSince <= professional.maintenanceLimitDays &&
      !sentInCycle("MANUTENCAO")
    ) {
      await push({
        kind: "MANUTENCAO",
        client,
        refDate: cycleAnchor,
        ctx: { clientName: client.name, serviceName: lastLash.service.name },
      });
    }

    // Resgate: 45 / 60 / 90 dias sem retorno (o maior nível aplicável)
    if (!hasFuture) {
      const tier: TemplateKind | null =
        daysSince >= 90 ? "RESGATE_90" : daysSince >= 60 ? "RESGATE_60" : daysSince >= 45 ? "RESGATE_45" : null;
      if (tier && !sentInCycle(tier)) {
        await push({
          kind: tier,
          client,
          refDate: cycleAnchor,
          ctx: { clientName: client.name },
        });
      }
    }
  }

  return items;
}
