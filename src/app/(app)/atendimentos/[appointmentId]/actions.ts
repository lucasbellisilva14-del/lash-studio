"use server";

/**
 * Server actions da ficha técnica do atendimento.
 * Multi-tenant: toda escrita valida que o agendamento pertence à profissional.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { getStorageProvider, newStorageKey } from "@/lib/providers/storage";
import { processPhoto } from "@/lib/images";
import { applyFee, parseBRL } from "@/lib/money";
import {
  CURVATURES,
  MAPPING_MAX_MM,
  MAPPING_MIN_MM,
  MAPPING_ZONES,
  PAYMENT_METHODS,
  TECHNIQUES,
  THICKNESSES,
  VOLUME_FACTORS,
} from "@/lib/constants";

export type FichaState = { success?: string; error?: string; savedAt?: number };
export type PhotoState = { success?: string; error?: string };
export type PaymentState = { success?: string; error?: string };

function textOrNull(value: FormDataEntryValue | null, maxLength = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function findOwnAppointment(appointmentId: string, professionalId: string) {
  if (!appointmentId) return null;
  return prisma.appointment.findFirst({
    where: { id: appointmentId, professionalId },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { name: true, category: true } },
    },
  });
}

function revalidateAtendimento(appointmentId: string, clientId: string) {
  revalidatePath(`/atendimentos/${appointmentId}`);
  revalidatePath(`/clientes/${clientId}`);
}

/* ------------------------------------------------------------------ */
/* Ficha técnica (upsert AttendanceRecord)                             */
/* ------------------------------------------------------------------ */

export async function saveFichaAction(
  _prev: FichaState,
  formData: FormData,
): Promise<FichaState> {
  const professionalId = await requireProfessionalId();
  const appointmentId = textOrNull(formData.get("appointmentId")) ?? "";
  const appointment = await findOwnAppointment(appointmentId, professionalId);
  if (!appointment) return { error: "Atendimento não encontrado." };

  const techniqueRaw = textOrNull(formData.get("technique"));
  const technique = techniqueRaw && techniqueRaw in TECHNIQUES ? techniqueRaw : null;

  const volumeFactorRaw = textOrNull(formData.get("volumeFactor"));
  const volumeFactor =
    technique === "VOLUME_RUSSO" &&
    volumeFactorRaw &&
    (VOLUME_FACTORS as readonly string[]).includes(volumeFactorRaw)
      ? volumeFactorRaw
      : null;

  const curvatureList = formData
    .getAll("curvatures")
    .map(String)
    .filter((c) => (CURVATURES as readonly string[]).includes(c));
  const curvatures = curvatureList.length > 0 ? curvatureList.join(",") : null;

  const thicknessRaw = textOrNull(formData.get("thickness"));
  const thickness =
    thicknessRaw && (THICKNESSES as readonly string[]).includes(thicknessRaw)
      ? thicknessRaw
      : null;

  let mappingJson: string | null = null;
  try {
    const zones: unknown = JSON.parse(String(formData.get("mapping") ?? ""));
    if (Array.isArray(zones) && zones.length === MAPPING_ZONES) {
      mappingJson = JSON.stringify({
        zones: zones.map((z) =>
          clamp(Math.round(Number(z)) || MAPPING_MIN_MM, MAPPING_MIN_MM, MAPPING_MAX_MM),
        ),
      });
    }
  } catch {
    mappingJson = null;
  }

  const glueBrand = textOrNull(formData.get("glueBrand"), 120);
  const glueBatch = textOrNull(formData.get("glueBatch"), 120);

  // Retenção só faz sentido em manutenção — gate também no servidor.
  let retentionPct: number | null = null;
  if (appointment.service.category === "MANUTENCAO") {
    const raw = textOrNull(formData.get("retentionPct"));
    if (raw !== null) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) retentionPct = clamp(parsed, 0, 100);
    }
  }

  let durationMin: number | null = null;
  const durationRaw = textOrNull(formData.get("durationMin"));
  if (durationRaw !== null) {
    const parsed = Number.parseInt(durationRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) durationMin = clamp(parsed, 1, 1440);
  }

  const notes = textOrNull(formData.get("notes"), 2000);

  const data = {
    technique,
    volumeFactor,
    curvatures,
    thickness,
    mappingJson,
    glueBrand,
    glueBatch,
    retentionPct,
    durationMin,
    notes,
  };

  await prisma.attendanceRecord.upsert({
    where: { appointmentId: appointment.id },
    create: {
      professionalId,
      appointmentId: appointment.id,
      clientId: appointment.client.id,
      ...data,
    },
    update: data,
  });

  revalidateAtendimento(appointment.id, appointment.client.id);
  return { success: "Ficha salva com sucesso.", savedAt: Date.now() };
}

/* ------------------------------------------------------------------ */
/* Fotos antes/depois                                                  */
/* ------------------------------------------------------------------ */

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function uploadPhotoAction(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const professionalId = await requireProfessionalId();
  const appointmentId = textOrNull(formData.get("appointmentId")) ?? "";
  const kind = formData.get("kind") === "DEPOIS" ? "DEPOIS" : "ANTES";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione uma imagem." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Formato não suportado — envie uma imagem." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Imagem muito grande (máximo 12 MB)." };
  }

  const appointment = await findOwnAppointment(appointmentId, professionalId);
  if (!appointment) return { error: "Atendimento não encontrado." };

  // Garante a ficha (pode fotografar antes de preencher o restante).
  const record = await prisma.attendanceRecord.upsert({
    where: { appointmentId: appointment.id },
    create: {
      professionalId,
      appointmentId: appointment.id,
      clientId: appointment.client.id,
    },
    update: {},
  });

  // Converte p/ WebP (corrigindo rotação EXIF) e gera miniatura p/ listas.
  const raw = Buffer.from(await file.arrayBuffer());
  let processed: Awaited<ReturnType<typeof processPhoto>>;
  try {
    processed = await processPhoto(raw);
  } catch {
    return { error: "Não foi possível ler essa imagem — tente outra foto." };
  }

  const storage = getStorageProvider();
  const storageKey = newStorageKey(professionalId, "fotos", processed.contentType);
  const thumbKey = newStorageKey(professionalId, "fotos", processed.contentType);
  await Promise.all([
    storage.put(storageKey, processed.full, processed.contentType),
    storage.put(thumbKey, processed.thumb, processed.contentType),
  ]);

  await prisma.photo.create({
    data: {
      professionalId,
      clientId: appointment.client.id,
      attendanceRecordId: record.id,
      kind,
      storageKey,
      thumbKey,
    },
  });

  revalidateAtendimento(appointment.id, appointment.client.id);
  return {
    success: kind === "ANTES" ? "Foto de antes adicionada." : "Foto de depois adicionada.",
  };
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  const professionalId = await requireProfessionalId();
  const photoId = textOrNull(formData.get("photoId")) ?? "";
  const appointmentId = textOrNull(formData.get("appointmentId")) ?? "";

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, professionalId },
  });
  if (!photo) return;

  await getStorageProvider().delete(photo.storageKey);
  if (photo.thumbKey) await getStorageProvider().delete(photo.thumbKey);
  await prisma.photo.delete({ where: { id: photo.id } });

  revalidateAtendimento(appointmentId, photo.clientId);
}

/* ------------------------------------------------------------------ */
/* Pagamento (lançamento financeiro do atendimento)                    */
/* ------------------------------------------------------------------ */

export async function registerPaymentAction(
  _prev: PaymentState,
  formData: FormData,
): Promise<PaymentState> {
  const professionalId = await requireProfessionalId();
  const appointmentId = textOrNull(formData.get("appointmentId")) ?? "";
  const appointment = await findOwnAppointment(appointmentId, professionalId);
  if (!appointment) return { error: "Atendimento não encontrado." };

  const existing = await prisma.transaction.findFirst({
    where: {
      professionalId,
      appointmentId: appointment.id,
      type: "RECEITA",
      kind: "ATENDIMENTO",
    },
  });
  if (existing) return { error: "O recebimento deste atendimento já foi registrado." };

  const amountCents = parseBRL(String(formData.get("amount") ?? ""));
  if (amountCents <= 0) return { error: "Informe um valor válido." };

  const method = textOrNull(formData.get("method")) ?? "";
  if (!(method in PAYMENT_METHODS)) return { error: "Escolha a forma de pagamento." };

  let installments: number | null = null;
  if (method === "CREDITO_PARCELADO") {
    const parsed = Number.parseInt(String(formData.get("installments") ?? ""), 10);
    installments = Number.isFinite(parsed) ? clamp(parsed, 2, 12) : 2;
  }

  const feeRow = await prisma.paymentMethodFee.findUnique({
    where: { professionalId_method: { professionalId, method } },
  });
  const feePct = feeRow?.feePct ?? 0;
  const { feeCents, netCents } = applyFee(amountCents, feePct);

  await prisma.transaction.create({
    data: {
      professionalId,
      type: "RECEITA",
      kind: "ATENDIMENTO",
      appointmentId: appointment.id,
      clientId: appointment.client.id,
      description: `${appointment.service.name} (${appointment.client.name})`,
      amountCents,
      method,
      installments,
      feePct,
      feeCents,
      netCents,
      date: new Date(),
    },
  });

  revalidateAtendimento(appointment.id, appointment.client.id);
  revalidatePath("/financeiro");
  return { success: "Recebimento registrado." };
}
