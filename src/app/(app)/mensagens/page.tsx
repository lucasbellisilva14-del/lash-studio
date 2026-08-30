import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { IconSettings } from "@/components/ui/icons";
import { QueueList, type QueueListItem } from "@/components/mensagens/queue-list";
import { AvulsaSheet } from "@/components/mensagens/avulsa-sheet";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { buildMessageQueue, type QueueItem } from "@/lib/domain/queue";
import { formatDate, formatDateLong, formatTime } from "@/lib/dates";

export const metadata = { title: "Mensagens" };

/** Linha de contexto por tipo (a refDate é o startAt/âncora do ciclo). */
function itemMeta(item: QueueItem, tz: string): string | null {
  switch (item.kind) {
    case "CONFIRMACAO":
    case "LEMBRETE_24H":
      return `Atendimento em ${formatDate(item.refDate, tz)} às ${formatTime(item.refDate, tz)}`;
    case "POS_APLICACAO":
      return `Atendimento concluído em ${formatDate(item.refDate, tz)}`;
    case "MANUTENCAO":
    case "RESGATE_45":
    case "RESGATE_60":
    case "RESGATE_90":
      return `Último atendimento em ${formatDate(item.refDate, tz)}`;
    case "ANIVERSARIO":
      return "Aniversário hoje";
    default:
      return null;
  }
}

export default async function MensagensPage(props: PageProps<"/mensagens">) {
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const searchParams = await props.searchParams;
  const clienteId =
    typeof searchParams.cliente === "string" ? searchParams.cliente : null;

  const queue = await buildMessageQueue(professional.id);

  // A dedupe do queue.ts só olha logs ENVIADA (confirmação/lembrete/pós).
  // Descartadas saem da fila aqui: mesmo kind + appointmentId, ou kind + cliente + refDate.
  const discarded = await prisma.messageLog.findMany({
    where: { professionalId: professional.id, status: "DESCARTADA" },
    select: { kind: true, appointmentId: true, clientId: true, refDate: true },
  });
  const pending = queue.filter(
    (item) =>
      !discarded.some(
        (log) =>
          log.kind === item.kind &&
          (item.appointmentId
            ? log.appointmentId === item.appointmentId
            : log.clientId === item.client.id &&
              log.refDate?.getTime() === item.refDate.getTime()),
      ),
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
    meta: itemMeta(item, tz),
  }));

  // Mensagem avulsa: /mensagens?cliente=<id>
  const avulsaClient = clienteId
    ? await prisma.client.findFirst({
        where: { id: clienteId, professionalId: professional.id },
        select: { id: true, name: true, phone: true },
      })
    : null;

  return (
    <>
      <PageHeader
        title="Mensagens"
        subtitle={`Fila de hoje · ${formatDateLong(new Date(), tz)}`}
        action={
          <Link
            href="/mensagens/templates"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-background"
          >
            <IconSettings width={16} height={16} />
            Templates
          </Link>
        }
      />
      <QueueList items={items} />
      {avulsaClient ? <AvulsaSheet client={avulsaClient} /> : null}
    </>
  );
}
