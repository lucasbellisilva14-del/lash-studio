"use server";

/** Server actions do módulo Clientes (CRM). Multi-tenant: sempre professionalId. */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { CLIENT_SOURCES } from "@/lib/constants";
import { getStorageProvider } from "@/lib/providers/storage";

export type ClientFormState = { error?: string; ok?: boolean };

function fieldText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Cria (sem id) ou atualiza (com id) o cadastro da cliente. */
export async function saveClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const professionalId = await requireProfessionalId();

  const id = fieldText(formData, "id");
  const name = fieldText(formData, "name");
  const phoneRaw = fieldText(formData, "phone");
  const instagramRaw = fieldText(formData, "instagram");
  const birthDateRaw = fieldText(formData, "birthDate");
  const sourceRaw = fieldText(formData, "source");
  const notes = fieldText(formData, "notes");

  if (!name) return { error: "Informe o nome da cliente." };
  if (!phoneRaw) return { error: "Informe o WhatsApp da cliente." };
  if (!isValidPhone(phoneRaw)) {
    return { error: "WhatsApp inválido. Use DDD + número, ex.: (48) 99999-8888." };
  }

  let birthDate: Date | null = null;
  if (birthDateRaw) {
    // input type="date" envia yyyy-MM-dd; gravamos ao meio-dia UTC p/ não deslizar de dia.
    const parsed = new Date(`${birthDateRaw}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return { error: "Data de nascimento inválida." };
    birthDate = parsed;
  }

  const instagram = instagramRaw
    ? instagramRaw.startsWith("@")
      ? instagramRaw
      : `@${instagramRaw}`
    : null;

  const data = {
    name,
    phone: normalizePhone(phoneRaw),
    instagram,
    birthDate,
    source: sourceRaw && sourceRaw in CLIENT_SOURCES ? sourceRaw : null,
    notes: notes || null,
  };

  if (id) {
    const updated = await prisma.client.updateMany({
      where: { id, professionalId },
      data,
    });
    if (updated.count === 0) return { error: "Cliente não encontrada." };
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { ok: true };
  }

  const created = await prisma.client.create({
    data: { professionalId, ...data },
  });
  revalidatePath("/clientes");
  redirect(`/clientes/${created.id}`);
}

export type DeleteClientState = { error?: string };

/**
 * LGPD: exclusão definitiva — apaga arquivos (fotos + assinaturas) no storage
 * e o Client (cascade leva anamnese, atendimentos, fotos, mensagens etc.).
 */
export async function deleteClientDataAction(
  _prev: DeleteClientState,
  formData: FormData,
): Promise<DeleteClientState> {
  const professionalId = await requireProfessionalId();

  const clientId = fieldText(formData, "clientId");
  const confirm = fieldText(formData, "confirm");
  if (confirm.toUpperCase() !== "EXCLUIR") {
    return { error: "Digite EXCLUIR para confirmar a exclusão." };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, professionalId },
    include: {
      photos: { select: { storageKey: true } },
      consentSignatures: { select: { imageKey: true } },
    },
  });
  if (!client) return { error: "Cliente não encontrada." };

  const storage = getStorageProvider();
  for (const photo of client.photos) {
    await storage.delete(photo.storageKey);
  }
  for (const signature of client.consentSignatures) {
    await storage.delete(signature.imageKey);
  }

  await prisma.client.delete({ where: { id: client.id } });

  revalidatePath("/clientes");
  redirect("/clientes");
}
