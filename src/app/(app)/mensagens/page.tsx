import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { IconEdit } from "@/components/ui/icons";
import {
  QueueList,
  type DoneListItem,
  type QueueListItem,
} from "@/components/mensagens/queue-list";
import { AvulsaSheet } from "@/components/mensagens/avulsa-sheet";
import { getProDirectory, withProView, type ProDirectory } from "@/components/home/pros";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer, type Viewer } from "@/lib/session";
import { clientScope } from "@/lib/team";
import {
  getMessageQueueForViewer,
  QUEUE_KIND_LABELS,
  QUEUE_KIND_OWNER,
  type QueueItem,
} from "@/lib/domain/queue";
import type { TemplateKind } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { dentroDaJanela, ehTipoAutomatico, janelaDeEnvio, tiposLigados } from "@/lib/whatsapp/tipos";
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

/** Tipos que a funcionária manda sem horário ligado: avulsa e os avisos "âncora". */
const KINDS_ANCORA = (Object.keys(QUEUE_KIND_OWNER) as TemplateKind[]).filter(
  (kind) => QUEUE_KIND_OWNER[kind] === "ancora",
);

/**
 * "Feitas hoje". Dona: tudo que saiu hoje. Funcionária: o que ela mesma
 * enviou, o que saiu ligado aos horários dela (inclusive o automático) e os
 * avisos de manutenção/retorno ancorados num atendimento dela.
 */
async function sentTodayFor(viewer: Viewer, todayStart: Date, todayEnd: Date) {
  const base: Prisma.MessageLogWhereInput = {
    professionalId: viewer.professionalId,
    status: "ENVIADA",
    sentAt: { gte: todayStart, lt: todayEnd },
  };
  const where: Prisma.MessageLogWhereInput = viewer.isOwner
    ? base
    : {
        ...base,
        client: clientScope(viewer),
        OR: [
          { sentByMemberId: viewer.memberId },
          { appointment: { is: { memberId: viewer.memberId } } },
          { appointmentId: null, kind: { in: KINDS_ANCORA } },
        ],
      };

  const logs = await prisma.messageLog.findMany({
    where,
    select: {
      id: true,
      kind: true,
      body: true,
      refDate: true,
      sentAt: true,
      appointmentId: true,
      sentByMemberId: true,
      auto: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  if (viewer.isOwner) return logs;

  // Manutenção/retorno sem horário ligado e enviados por outra pessoa: só os
  // ancorados num atendimento dela (a refDate do aviso é o startAt de origem).
  const ancorados = logs.filter(
    (log) =>
      !log.appointmentId &&
      log.sentByMemberId !== viewer.memberId &&
      (KINDS_ANCORA as string[]).includes(log.kind),
  );
  if (ancorados.length === 0) return logs;
  const refDates = ancorados.flatMap((log) => (log.refDate ? [log.refDate] : []));
  const meus =
    refDates.length > 0
      ? await prisma.appointment.findMany({
          where: {
            professionalId: viewer.professionalId,
            memberId: viewer.memberId,
            clientId: { in: [...new Set(ancorados.map((log) => log.client.id))] },
            startAt: { in: refDates },
          },
          select: { clientId: true, startAt: true },
        })
      : [];
  const ancoras = new Set(meus.map((a) => `${a.clientId}|${a.startAt.getTime()}`));
  return logs.filter(
    (log) =>
      !ancorados.includes(log) ||
      (log.refDate !== null && ancoras.has(`${log.client.id}|${log.refDate.getTime()}`)),
  );
}

/**
 * Selo do envio automático em cada item da fila. Sem WhatsApp conectado (ou
 * com o automático desligado), nenhum selo: tudo é manual como sempre.
 */
async function statusAutomatico(professionalId: string, queue: QueueItem[], now: Date, tz: string) {
  const nada = () => null;
  if (queue.length === 0) return nada;
  const conexao = await prisma.whatsAppConnection.findUnique({
    where: { professionalId },
    select: { status: true, autoSend: true, autoKinds: true },
  });
  if (!conexao || conexao.status !== "CONECTADO" || !conexao.autoSend) return nada;
  const ligados = tiposLigados(conexao.autoKinds);
  const semWhatsapp = await prisma.messageLog.findMany({
    where: {
      professionalId,
      status: "SEM_WHATSAPP",
      clientId: { in: [...new Set(queue.map((i) => i.client.id))] },
    },
    select: { kind: true, clientId: true, appointmentId: true, refDate: true, body: true },
  });
  const falhas = new Map(
    semWhatsapp.map((l) => [`${l.kind}:${l.clientId}:${l.appointmentId ?? l.refDate?.toISOString() ?? ""}`, l.body]),
  );
  const [h, m] = formatTime(now, tz).split(":").map(Number);
  const minutos = h * 60 + m;
  return (item: QueueItem): QueueListItem["auto"] => {
    if (!ehTipoAutomatico(item.kind) || !ligados.has(item.kind)) return null;
    const falha = falhas.get(item.key);
    if (falha && falha.includes(normalizePhone(item.client.phone))) {
      return { tipo: "SEM_WHATSAPP", texto: "Esse número não tem WhatsApp: confira o telefone ou mande por outro meio." };
    }
    if (dentroDaJanela(item.kind, minutos)) return { tipo: "SOZINHA", texto: "Sai sozinha em instantes pelo seu WhatsApp" };
    const [ini] = janelaDeEnvio(item.kind);
    const hora = `${String(Math.floor(ini / 60)).padStart(2, "0")}h${String(ini % 60).padStart(2, "0")}`;
    return { tipo: "SOZINHA", texto: minutos < ini ? `Sai sozinha a partir das ${hora}` : "Sai sozinha amanhã cedo pelo seu WhatsApp" };
  };
}

export default async function MensagensPage(props: PageProps<"/mensagens">) {
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const tz = professional.timezone;
  const now = new Date();
  const searchParams = await props.searchParams;
  const clienteId =
    typeof searchParams.cliente === "string" ? searchParams.cliente : null;

  // Fila de quem está logada: mesma construção que a coluna do PC usa nesta
  // requisição (descartadas já saem em buildMessageQueue).
  const queue = await getMessageQueueForViewer(viewer);
  const { start: todayStart, end: todayEnd } = localDayRange(now, tz);

  const [sentToday, avulsaClient, pros, automatico] = await Promise.all([
    // "Feitas hoje": o que saiu hoje no fuso do estúdio (fila, avulsa, automático).
    sentTodayFor(viewer, todayStart, todayEnd),
    // Mensagem avulsa: /mensagens?cliente=<id> (funcionária: só clientes dela)
    clienteId
      ? prisma.client.findFirst({
          where: { id: clienteId, professionalId: professional.id, ...clientScope(viewer) },
          select: { id: true, name: true, phone: true },
        })
      : Promise.resolve(null),
    // Com equipe, a dona vê de quem é cada aviso ("com Ana").
    viewer.isOwner ? getProDirectory(professional.id) : Promise.resolve<ProDirectory | null>(null),
    // WhatsApp conectado: o que vai sair sozinho e o que o automático não conseguiu.
    statusAutomatico(professional.id, queue, now, tz),
  ]);
  const showPros = pros?.hasTeam ?? false;

  const items: QueueListItem[] = queue.map((item) => ({
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
    pro:
      showPros && pros && item.memberId
        ? withProView(pros.of(item.memberId), viewer.memberId)
        : null,
    auto: automatico(item),
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
    auto: log.auto,
  }));

  return (
    <>
      <PageHeader
        title="Fila"
        subtitle={
          viewer.isOwner
            ? "Quem precisa de uma mensagem hoje: confirmações, lembretes, manutenção, retorno, aniversário e quem faltou."
            : "Suas clientes que precisam de uma mensagem hoje: confirmações, lembretes, manutenção, retorno e quem faltou."
        }
        action={
          viewer.isOwner ? (
            <Link href="/mensagens/templates" className={buttonClasses("secondary", "sm")}>
              <IconEdit width={16} height={16} />
              Modelos
            </Link>
          ) : undefined
        }
      />
      <QueueList items={items} done={done} />
      {avulsaClient ? <AvulsaSheet client={avulsaClient} /> : null}
    </>
  );
}
