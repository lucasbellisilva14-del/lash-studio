import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { IconEdit } from "@/components/ui/icons";
import {
  QueueList,
  type DoneListItem,
  type QueueListItem,
} from "@/components/mensagens/queue-list";
import { AvulsaSheet } from "@/components/mensagens/avulsa-sheet";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { getMessageQueueCached, QUEUE_KIND_LABELS, type QueueItem } from "@/lib/domain/queue";
import { diffLocalDays, formatDate, formatTime, localDayRange } from "@/lib/dates";

export const metadata = { title: "Fila de mensagens" };

/** "hoje às 14:00" · "amanhã às 14:00" · "ontem às 14:00" · "05/09/2026 às 14:00" */
function quando(date: Date, now: Date, tz: string): { texto: string; relativo: boolean } {
  const diff = diffLocalDays(now, date, tz);
  const hora = formatTime(date, tz);
  if (diff === 0) return { texto: `hoje às ${hora}`, relativo: true };
  if (diff === 1) return { texto: `amanhã às ${hora}`, relativo: true };
  if (diff === -1) return { texto: `ontem às ${hora}`, relativo: true };
  return { texto: `${formatDate(date, tz)} às ${hora}`, relativo: false };
}

function haDias(days: number): string {
  if (days <= 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Linha de contexto por tipo (a refDate é o startAt do atendimento-âncora). */
function itemMeta(item: QueueItem, now: Date, tz: string): string | null {
  const servico = item.serviceName ? ` · ${item.serviceName}` : "";
  const dias = item.daysSince ?? diffLocalDays(item.refDate, now, tz);
  switch (item.kind) {
    case "CONFIRMACAO":
    case "LEMBRETE_24H": {
      const { texto, relativo } = quando(item.refDate, now, tz);
      return `${relativo ? primeiraMaiuscula(texto) : `Em ${texto}`}${servico}`;
    }
    case "POS_APLICACAO": {
      const diff = diffLocalDays(item.refDate, now, tz);
      const dia = diff === 0 ? "hoje" : diff === 1 ? "ontem" : `em ${formatDate(item.refDate, tz)}`;
      return `Atendida ${dia}${servico}`;
    }
    case "MANUTENCAO":
    case "RETORNO":
    case "RESGATE_45":
    case "RESGATE_60":
    case "RESGATE_90":
      return `Último atendimento ${haDias(dias)}${servico}`;
    case "REMARCAR": {
      const { texto, relativo } = quando(item.refDate, now, tz);
      if (item.anchorStatus === "FALTOU") {
        return `Faltou ${relativo ? texto : `em ${texto}`}${servico}`;
      }
      if (item.anchorStatus === "CANCELADO_TARDE") {
        return `Cancelou em cima da hora · ${texto}${servico}`;
      }
      return `Cancelou o horário de ${texto}${servico}`;
    }
    case "ANIVERSARIO":
      return "Faz aniversário hoje";
    default:
      return null;
  }
}

function doneKindLabel(kind: string): string {
  if (kind in QUEUE_KIND_LABELS) return QUEUE_KIND_LABELS[kind as keyof typeof QUEUE_KIND_LABELS];
  return kind === "LIVRE" ? "Mensagem avulsa" : "Mensagem";
}

export default async function MensagensPage(props: PageProps<"/mensagens">) {
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const now = new Date();
  const searchParams = await props.searchParams;
  const clienteId =
    typeof searchParams.cliente === "string" ? searchParams.cliente : null;

  // Mesma construção da fila que a coluna do PC usa nesta requisição.
  const queue = await getMessageQueueCached(professional.id);
  const queueClientIds = [...new Set(queue.map((item) => item.client.id))];
  const { start: todayStart, end: todayEnd } = localDayRange(now, tz);

  const [discarded, sentToday, avulsaClient] = await Promise.all([
    // A dedupe do queue.ts só olha logs ENVIADA; descartadas saem da fila aqui.
    queueClientIds.length > 0
      ? prisma.messageLog.findMany({
          where: {
            professionalId: professional.id,
            status: "DESCARTADA",
            clientId: { in: queueClientIds },
          },
          select: { kind: true, appointmentId: true, clientId: true, refDate: true },
        })
      : Promise.resolve([]),
    // "Feitas hoje": tudo que saiu hoje no fuso da profissional (fila, avulsa, automático).
    prisma.messageLog.findMany({
      where: {
        professionalId: professional.id,
        status: "ENVIADA",
        sentAt: { gte: todayStart, lt: todayEnd },
      },
      select: {
        id: true,
        kind: true,
        body: true,
        refDate: true,
        sentAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 200,
    }),
    // Mensagem avulsa: /mensagens?cliente=<id>
    clienteId
      ? prisma.client.findFirst({
          where: { id: clienteId, professionalId: professional.id },
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve(null),
  ]);

  // Descartada = mesmo kind + appointmentId, ou kind + cliente + refDate.
  const discardedByAppointment = new Set(
    discarded.flatMap((log) => (log.appointmentId ? [`${log.kind}|${log.appointmentId}`] : [])),
  );
  const discardedByAnchor = new Set(
    discarded.flatMap((log) =>
      log.refDate ? [`${log.kind}|${log.clientId}|${log.refDate.getTime()}`] : [],
    ),
  );
  const pending = queue.filter((item) =>
    item.appointmentId
      ? !discardedByAppointment.has(`${item.kind}|${item.appointmentId}`)
      : !discardedByAnchor.has(`${item.kind}|${item.client.id}|${item.refDate.getTime()}`),
  );

  const items: QueueListItem[] = pending.map((item) => ({
    key: item.key,
    kind: item.kind,
    kindLabel: item.kindLabel,
    clientId: item.client.id,
    clientName: item.client.name,
    appointmentId: item.appointmentId,
    templateId: item.templateId,
    body: item.body,
    waUrl: item.waUrl,
    refDate: item.refDate.toISOString(),
    meta: itemMeta(item, now, tz),
  }));

  const done: DoneListItem[] = sentToday.map((log) => ({
    key: log.id,
    clientId: log.client.id,
    clientName: log.client.name,
    kind: log.kind,
    kindLabel: doneKindLabel(log.kind),
    body: log.body,
    timeLabel: log.sentAt ? formatTime(log.sentAt, tz) : "",
    refDate: log.refDate ? log.refDate.toISOString() : null,
  }));

  return (
    <>
      <PageHeader
        title="Fila"
        subtitle="Quem precisa de uma mensagem hoje: confirmações, lembretes, manutenção, retorno, aniversário e quem faltou."
        action={
          <Link href="/mensagens/templates" className={buttonClasses("secondary", "sm")}>
            <IconEdit width={16} height={16} />
            Modelos
          </Link>
        }
      />
      <QueueList items={items} done={done} />
      {avulsaClient ? <AvulsaSheet client={avulsaClient} /> : null}
    </>
  );
}
