/**
 * Fila do dia: todas as mensagens de WhatsApp que devem sair hoje.
 * Cada item já vem com o texto renderizado e o link wa.me pronto.
 * Dedup: MessageLog (kind + appointmentId/refDate) marca o que já saiu.
 *
 * Equipe: a fila é montada para o estúdio inteiro (as regras de "volta" olham
 * todos os horários da cliente) e cada item diz de quem é (memberId, nulo =
 * a dona). Telas usam getMessageQueueForViewer: a dona vê tudo; a funcionária,
 * só os avisos dela.
 */
import { cache } from "react";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/session";
import { LASH_CYCLE_CATEGORIES, type ServiceCategory, type TemplateKind } from "@/lib/constants";
import { dayKeyToUtcStart, diffLocalDays, localDayKey } from "@/lib/dates";
import { renderTemplate } from "@/lib/domain/templates";
import { waLink } from "@/lib/phone";
import { buildPixPayload } from "@/lib/pix";

/**
 * De quem é cada tipo de aviso (equipe; memberId nulo = a dona):
 * - "agendamento": confirmação, lembrete, pós e remarcar → quem atende aquele horário;
 * - "ancora": manutenção e retorno → quem fez o atendimento que originou o aviso
 *   (o último daquela cliente no ciclo dos cílios / naquela categoria);
 * - "dona": aniversário e resgate, que não têm horário de ninguém → a dona.
 */
export type QueueOwnerRule = "agendamento" | "ancora" | "dona";

export const QUEUE_KIND_OWNER: Record<TemplateKind, QueueOwnerRule> = {
  CONFIRMACAO: "agendamento",
  LEMBRETE_24H: "agendamento",
  POS_APLICACAO: "agendamento",
  REMARCAR: "agendamento",
  MANUTENCAO: "ancora",
  RETORNO: "ancora",
  ANIVERSARIO: "dona",
  RESGATE_45: "dona",
  RESGATE_60: "dona",
  RESGATE_90: "dona",
};

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
  /** Serviço do atendimento-âncora (linha de contexto da tela). */
  serviceName: string | null;
  /** Status do atendimento-âncora — no REMARCAR diz se ela faltou ou cancelou. */
  anchorStatus: string | null;
  /** Dias desde o atendimento-âncora (manutenção, retorno, resgate, remarcar). */
  daysSince: number | null;
  /** De quem é o aviso (regra em QUEUE_KIND_OWNER): nulo = a dona. */
  memberId: string | null;
};

/** Rótulos curtos dos tipos na fila (cartões, abas, "Feitas hoje"). */
export const QUEUE_KIND_LABELS: Record<TemplateKind, string> = {
  CONFIRMACAO: "Confirmação",
  LEMBRETE_24H: "Lembrete 24h",
  POS_APLICACAO: "Pós-aplicação",
  MANUTENCAO: "Manutenção",
  ANIVERSARIO: "Aniversário",
  RESGATE_45: "Resgate 45d",
  RESGATE_60: "Resgate 60d",
  RESGATE_90: "Resgate 90d",
  REMARCAR: "Remarcar horário",
  RETORNO: "Hora do retorno",
};

/** REMARCAR: falta ou cancelamento dos últimos N dias (em dias locais). */
export const REMARCAR_JANELA_DIAS = 30;
/** RETORNO: a cliente fica na fila de `returnDays` até `returnDays + N` dias. */
export const RETORNO_TOLERANCIA_DIAS = 45;

/** Horário marcado e ainda em aberto (bloqueia os avisos de "volta"). */
const HORARIO_EM_ABERTO = ["PRE_AGENDADO", "CONFIRMADO"];
const FALTA_OU_CANCELAMENTO = ["FALTOU", "CANCELADO", "CANCELADO_TARDE"];
/** Tipos deduplicados por cliente (âncora = refDate/appointmentId do log). */
const KINDS_POR_CLIENTE: TemplateKind[] = [
  "MANUTENCAO",
  "ANIVERSARIO",
  "RESGATE_45",
  "RESGATE_60",
  "RESGATE_90",
  "REMARCAR",
  "RETORNO",
];

function isLashCycle(category: string): boolean {
  return LASH_CYCLE_CATEGORIES.includes(category as ServiceCategory);
}

/** Primeiro valor de um header que pode vir em lista ("a, b"). */
function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Origem pública do app (ex.: https://lash-studio-chi.vercel.app).
 * Mesma regra das outras URLs absolutas do app (feed .ics, e-mail de nova
 * senha, volta da assinatura): host da requisição (x-forwarded-host ou host)
 * + x-forwarded-proto. NEXT_PUBLIC_APP_URL ou AUTH_URL, quando configuradas,
 * fixam um domínio canônico. Fora de requisição (script), usa as envs da Vercel.
 */
export async function getAppOrigin(): Promise<string> {
  for (const configured of [process.env.NEXT_PUBLIC_APP_URL, process.env.AUTH_URL]) {
    if (!configured) continue;
    try {
      return new URL(configured).origin;
    } catch {
      // Valor inválido: tenta a próxima fonte.
    }
  }
  try {
    const h = await headers();
    const host = firstHeaderValue(h.get("x-forwarded-host")) ?? firstHeaderValue(h.get("host"));
    if (host) {
      const proto = firstHeaderValue(h.get("x-forwarded-proto")) ?? "https";
      return `${proto}://${host}`;
    }
  } catch (error) {
    unstable_rethrow(error);
    // Fora de uma requisição (script): segue para as envs.
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

/** Link público de agendamento da profissional — vira {{link_agendamento}}. */
export async function getBookingUrl(slug: string): Promise<string> {
  return `${await getAppOrigin()}/agendar/${encodeURIComponent(slug)}`;
}

/**
 * Versão memoizada por request (React cache): home, gamificação e a coluna
 * desktop compartilham UMA construção da fila — essencial no serverless com
 * pool de 1 conexão.
 */
export const getMessageQueueCached = cache((professionalId: string) =>
  buildMessageQueue(professionalId),
);

/** Só os avisos de uma funcionária (sobre a mesma fila memoizada do estúdio). */
const getMemberQueueCached = cache(
  async (professionalId: string, memberId: string): Promise<QueueItem[]> =>
    (await getMessageQueueCached(professionalId)).filter((item) => item.memberId === memberId),
);

/**
 * Fila de quem está logada (memoizada por request): a dona vê o estúdio
 * inteiro; a funcionária, só os avisos dela (QUEUE_KIND_OWNER).
 */
export function getMessageQueueForViewer(
  viewer: Pick<Viewer, "professionalId" | "memberId" | "isOwner">,
): Promise<QueueItem[]> {
  if (viewer.isOwner) return getMessageQueueCached(viewer.professionalId);
  if (!viewer.memberId) return Promise.resolve([]);
  return getMemberQueueCached(viewer.professionalId, viewer.memberId);
}

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

  const [templates, bookingUrl] = await Promise.all([
    prisma.messageTemplate.findMany({ where: { professionalId, active: true } }),
    getBookingUrl(professional.slug),
  ]);
  const templateByKind = new Map(templates.map((t) => [t.kind as TemplateKind, t]));

  const items: QueueItem[] = [];

  const baseCtx = {
    addressLine: professional.addressLine,
    mapsUrl: professional.mapsUrl,
    pixKey: professional.pixKey,
    studioName: professional.studioName,
    timezone: tz,
    bookingUrl,
  };

  function push(params: {
    kind: TemplateKind;
    client: { id: string; name: string; phone: string };
    appointmentId?: string | null;
    refDate: Date;
    ctx: Parameters<typeof renderTemplate>[1];
    info?: { serviceName?: string | null; anchorStatus?: string | null; daysSince?: number | null };
    /** Quem atende o horário-âncora (nulo = a dona). Ignorado nos avisos da dona. */
    memberId?: string | null;
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
    const client = { id: params.client.id, name: params.client.name, phone: params.client.phone };
    // Montar a fila NUNCA envia nada — só prepara o link manual (wa.me).
    // Envio real por API é ato explícito (cron de envio automático).
    items.push({
      key: `${params.kind}:${client.id}:${params.appointmentId ?? params.refDate.toISOString()}`,
      kind: params.kind,
      kindLabel: QUEUE_KIND_LABELS[params.kind],
      client,
      appointmentId: params.appointmentId ?? null,
      templateId: template.id,
      body,
      waUrl: waLink(client.phone, body),
      refDate: params.refDate,
      serviceName: params.info?.serviceName ?? null,
      anchorStatus: params.info?.anchorStatus ?? null,
      daysSince: params.info?.daysSince ?? null,
      memberId: QUEUE_KIND_OWNER[params.kind] === "dona" ? null : (params.memberId ?? null),
    });
  }

  // ── 1. Confirmações: agendamentos futuros ainda sem mensagem de confirmação ──
  const upcoming = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: HORARIO_EM_ABERTO },
      startAt: { gte: now, lte: addDays(now, 30) },
      messageLogs: { none: { kind: "CONFIRMACAO", status: "ENVIADA" } },
    },
    include: { client: true, service: true },
    orderBy: { startAt: "asc" },
  });
  for (const appt of upcoming) {
    push({
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
        // Mercado Pago integrado: usa o Pix da cobrança (confirma sozinho)
        pixCopiaECola: appt.pixCopiaCola,
      },
      info: { serviceName: appt.service.name },
      memberId: appt.memberId,
    });
  }

  // ── 2. Lembrete 24h: agendamentos de amanhã ──
  const tomorrow = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: HORARIO_EM_ABERTO },
      startAt: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
      messageLogs: { none: { kind: "LEMBRETE_24H", status: "ENVIADA" } },
    },
    include: { client: true, service: true },
    orderBy: { startAt: "asc" },
  });
  for (const appt of tomorrow) {
    push({
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
      info: { serviceName: appt.service.name },
      memberId: appt.memberId,
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
    orderBy: { startAt: "asc" },
  });
  for (const appt of recentDone) {
    push({
      kind: "POS_APLICACAO",
      client: appt.client,
      appointmentId: appt.id,
      refDate: appt.startAt,
      ctx: { clientName: appt.client.name, serviceName: appt.service.name },
      info: { serviceName: appt.service.name },
      memberId: appt.memberId,
    });
  }

  // ── 4-8. Por cliente: aniversário, remarcar, manutenção, retorno, resgate ──
  // Folga de 1 dia na consulta; o corte exato dos 30 dias é feito em dia local.
  const remarcarDesde = addDays(todayStart, -(REMARCAR_JANELA_DIAS + 1));
  const clients = await prisma.client.findMany({
    where: { professionalId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      appointments: {
        where: {
          professionalId,
          OR: [
            // Concluídos: âncora do ciclo dos cílios e do retorno por serviço
            { status: "CONCLUIDO" },
            // Horário em aberto no futuro: ela não recebe aviso de "volta"
            { status: { in: HORARIO_EM_ABERTO }, startAt: { gte: now } },
            // Últimos 30 dias, qualquer status: falta/cancelamento → remarcar
            { startAt: { gte: remarcarDesde, lte: now } },
          ],
        },
        select: {
          id: true,
          status: true,
          startAt: true,
          memberId: true,
          service: { select: { name: true, category: true, returnDays: true } },
        },
        orderBy: { startAt: "desc" },
      },
      messageLogs: {
        where: { professionalId, status: "ENVIADA", kind: { in: KINDS_POR_CLIENTE } },
        select: { kind: true, refDate: true, appointmentId: true },
      },
    },
  });

  // Modelo de remarcar desligado = a cliente segue nos avisos normais.
  const remarcarAtivo = templateByKind.has("REMARCAR");

  for (const client of clients) {
    const appts = client.appointments; // mais recente primeiro
    const hasFuture = appts.some(
      (a) => HORARIO_EM_ABERTO.includes(a.status) && a.startAt >= now,
    );
    /** Já saiu mensagem deste tipo ancorada neste atendimento? */
    const alreadySent = (kind: TemplateKind, anchor: { id: string; startAt: Date }) =>
      client.messageLogs.some(
        (log) =>
          log.kind === kind &&
          (log.refDate?.getTime() === anchor.startAt.getTime() || log.appointmentId === anchor.id),
      );

    // Aniversário (independe do ciclo)
    if (client.birthDate) {
      const birthKey = localDayKey(client.birthDate, "UTC").slice(5); // "MM-dd"
      if (todayKey.slice(5) === birthKey) {
        const sentThisYear = client.messageLogs.some(
          (log) =>
            log.kind === "ANIVERSARIO" &&
            log.refDate &&
            localDayKey(log.refDate, tz).slice(0, 4) === todayKey.slice(0, 4),
        );
        if (!sentThisYear) {
          push({
            kind: "ANIVERSARIO",
            client,
            refDate: todayStart,
            ctx: { clientName: client.name },
          });
        }
      }
    }

    // Remarcar: o atendimento mais recente dos últimos 30 dias foi falta ou
    // cancelamento, e ela não tem horário marcado.
    const lastPast = appts.find((a) => a.startAt <= now) ?? null;
    const missed =
      lastPast &&
      FALTA_OU_CANCELAMENTO.includes(lastPast.status) &&
      diffLocalDays(lastPast.startAt, now, tz) <= REMARCAR_JANELA_DIAS
        ? lastPast
        : null;
    // Enquanto a falta/cancelamento for o passo mais recente dela, o REMARCAR é
    // a única mensagem de "volta": manutenção, retorno e resgate ficam em pausa
    // (evita dois recados com o mesmo pedido para a mesma cliente).
    const emRemarcar = remarcarAtivo && !hasFuture && missed !== null;
    if (emRemarcar && missed && !alreadySent("REMARCAR", missed)) {
      push({
        kind: "REMARCAR",
        client,
        appointmentId: missed.id,
        refDate: missed.startAt,
        ctx: {
          clientName: client.name,
          serviceName: missed.service.name,
          startAt: missed.startAt,
        },
        info: {
          serviceName: missed.service.name,
          anchorStatus: missed.status,
          daysSince: diffLocalDays(missed.startAt, now, tz),
        },
        memberId: missed.memberId,
      });
    }

    if (hasFuture || emRemarcar) continue;

    // Ciclo dos cílios (aplicação/manutenção): aviso de manutenção e resgate
    const lastLash =
      appts.find((a) => a.status === "CONCLUIDO" && isLashCycle(a.service.category)) ?? null;
    const lashDays = lastLash ? diffLocalDays(lastLash.startAt, now, tz) : null;

    // Aviso de manutenção: do dia configurado do ciclo até o prazo-limite
    if (
      lastLash &&
      lashDays != null &&
      lashDays >= professional.maintenanceNoticeDay &&
      lashDays <= professional.maintenanceLimitDays &&
      !alreadySent("MANUTENCAO", lastLash)
    ) {
      push({
        kind: "MANUTENCAO",
        client,
        refDate: lastLash.startAt,
        ctx: { clientName: client.name, serviceName: lastLash.service.name },
        info: { serviceName: lastLash.service.name, daysSince: lashDays },
        memberId: lastLash.memberId,
      });
    }

    // Retorno: para cada categoria fora do ciclo dos cílios (lifting, brow,
    // design...), vale o último concluído daquela categoria — quem faz cílios e
    // sobrancelha também recebe o retorno da sobrancelha. Fica na fila de
    // returnDays até returnDays + 45 dias, uma vez por atendimento; se mais de
    // um serviço vencer junto, sai um recado só, o mais atrasado.
    const ultimoPorCategoria = new Map<string, (typeof appts)[number]>();
    for (const a of appts) {
      if (a.status !== "CONCLUIDO" || isLashCycle(a.service.category)) continue;
      if (!ultimoPorCategoria.has(a.service.category)) ultimoPorCategoria.set(a.service.category, a);
    }
    let retorno: { appt: (typeof appts)[number]; dias: number; atraso: number } | null = null;
    for (const a of ultimoPorCategoria.values()) {
      const returnDays = a.service.returnDays;
      if (returnDays == null || returnDays <= 0) continue;
      const dias = diffLocalDays(a.startAt, now, tz);
      if (dias < returnDays || dias > returnDays + RETORNO_TOLERANCIA_DIAS) continue;
      if (alreadySent("RETORNO", a)) continue;
      if (!retorno || dias - returnDays > retorno.atraso) {
        retorno = { appt: a, dias, atraso: dias - returnDays };
      }
    }
    if (retorno) {
      push({
        kind: "RETORNO",
        client,
        refDate: retorno.appt.startAt,
        ctx: { clientName: client.name, serviceName: retorno.appt.service.name },
        info: { serviceName: retorno.appt.service.name, daysSince: retorno.dias },
        memberId: retorno.appt.memberId,
      });
    }

    // Resgate: 45 / 60 / 90 dias sem retorno no ciclo dos cílios (o maior nível aplicável)
    if (lastLash && lashDays != null) {
      const tier: TemplateKind | null =
        lashDays >= 90
          ? "RESGATE_90"
          : lashDays >= 60
            ? "RESGATE_60"
            : lashDays >= 45
              ? "RESGATE_45"
              : null;
      if (tier && !alreadySent(tier, lastLash)) {
        push({
          kind: tier,
          client,
          refDate: lastLash.startAt,
          ctx: { clientName: client.name },
          info: { serviceName: lastLash.service.name, daysSince: lashDays },
        });
      }
    }
  }

  // Descartada pela profissional sai da fila em todo lugar (home, PC, push,
  // gamificação e envio automático), não só na tela da Fila.
  // Mesma regra da tela: kind + appointmentId, ou kind + cliente + refDate.
  if (items.length === 0) return items;
  const descartadas = await prisma.messageLog.findMany({
    where: {
      professionalId,
      status: "DESCARTADA",
      clientId: { in: [...new Set(items.map((i) => i.client.id))] },
    },
    select: { kind: true, appointmentId: true, clientId: true, refDate: true },
  });
  if (descartadas.length === 0) return items;
  const porAtendimento = new Set(
    descartadas.flatMap((log) => (log.appointmentId ? [`${log.kind}|${log.appointmentId}`] : [])),
  );
  const porAncora = new Set(
    descartadas.flatMap((log) =>
      log.refDate ? [`${log.kind}|${log.clientId}|${log.refDate.getTime()}`] : [],
    ),
  );
  return items.filter((item) =>
    item.appointmentId
      ? !porAtendimento.has(`${item.kind}|${item.appointmentId}`)
      : !porAncora.has(`${item.kind}|${item.client.id}|${item.refDate.getTime()}`),
  );
}
