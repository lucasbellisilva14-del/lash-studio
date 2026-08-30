"use server";

/**
 * Server actions da Central de WhatsApp.
 * Toda ação valida sessão (requireProfessionalId) e posse dos registros
 * (clientId/appointmentId/templateId sempre conferidos contra o tenant).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { TEMPLATE_KINDS, type TemplateKind } from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

const kindEnum = z.enum(
  Object.keys(TEMPLATE_KINDS) as [TemplateKind, ...TemplateKind[]],
);

const queueItemSchema = z.object({
  kind: kindEnum,
  clientId: z.string().min(1),
  appointmentId: z.string().min(1).nullable(),
  templateId: z.string().min(1).nullable(),
  body: z.string().min(1).max(4000),
  /** ISO string — âncora de dedupe gravada em MessageLog.refDate. */
  refDate: z.coerce.date(),
});

type QueueItemInput = z.infer<typeof queueItemSchema>;

async function registrarLog(
  input: unknown,
  status: "ENVIADA" | "DESCARTADA",
): Promise<ActionResult> {
  const professionalId = await requireProfessionalId();

  const parsed = queueItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const data: QueueItemInput = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, professionalId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente não encontrada." };

  let appointmentId: string | null = null;
  if (data.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: data.appointmentId, professionalId },
      select: { id: true },
    });
    appointmentId = appointment?.id ?? null;
  }

  let templateId: string | null = null;
  if (data.templateId) {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: data.templateId, professionalId },
      select: { id: true },
    });
    templateId = template?.id ?? null;
  }

  // Guarda contra duplo toque: se já existe log igual com o mesmo status, não recria.
  const existing = await prisma.messageLog.findFirst({
    where: {
      professionalId,
      clientId: data.clientId,
      kind: data.kind,
      status,
      ...(appointmentId ? { appointmentId } : { refDate: data.refDate }),
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.messageLog.create({
      data: {
        professionalId,
        clientId: data.clientId,
        appointmentId,
        templateId,
        kind: data.kind,
        channel: "WHATSAPP",
        body: data.body,
        status,
        refDate: data.refDate,
        sentAt: status === "ENVIADA" ? new Date() : null,
      },
    });
  }

  revalidatePath("/mensagens");
  return { ok: true };
}

/** Registra a mensagem da fila como enviada (abre o wa.me no clique do link). */
export async function marcarEnviada(input: unknown): Promise<ActionResult> {
  return registrarLog(input, "ENVIADA");
}

/** Descarta a mensagem da fila (não volta a aparecer neste ciclo/agendamento). */
export async function descartarMensagem(input: unknown): Promise<ActionResult> {
  return registrarLog(input, "DESCARTADA");
}

const livreSchema = z.object({
  clientId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

/** Mensagem avulsa (?cliente=<id>): registra MessageLog kind LIVRE como enviada. */
export async function enviarMensagemLivre(input: unknown): Promise<ActionResult> {
  const professionalId = await requireProfessionalId();

  const parsed = livreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escreva a mensagem antes de enviar." };

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, professionalId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Cliente não encontrada." };

  await prisma.messageLog.create({
    data: {
      professionalId,
      clientId: client.id,
      kind: "LIVRE",
      channel: "WHATSAPP",
      body: parsed.data.body,
      status: "ENVIADA",
      refDate: new Date(),
      sentAt: new Date(),
    },
  });

  revalidatePath("/mensagens");
  return { ok: true };
}
