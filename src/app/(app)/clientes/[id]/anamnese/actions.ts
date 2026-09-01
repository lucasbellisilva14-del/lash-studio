"use server";

/**
 * Server actions da anamnese digital (dados sensíveis de saúde).
 * Multi-tenant: toda consulta filtra por professionalId.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireProfessionalId } from "@/lib/session";
import { getStorageProvider, newStorageKey } from "@/lib/providers/storage";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import {
  ANAMNESIS_QUESTIONS,
  DEFAULT_CONSENT_TEXT,
  FLAG_ALERGIA_CIANOACRILATO,
  type AnamnesisAnswer,
  type AnamnesisQuestionId,
} from "@/components/anamnese/questions";

export type AnamnesisState = { error?: string };

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

const NATURAL_KEYS = Object.keys(NATURAL_LASH_CONDITIONS) as [string, ...string[]];

const respostaSchema = z.object({
  sim: z.boolean(),
  detalhe: z.string().trim().max(600, "Detalhe muito longo (máximo 600 caracteres)."),
});

const payloadSchema = z.object({
  clientId: z.string().min(1, "Cliente inválida."),
  respostas: z.record(z.string(), respostaSchema),
  alergiaCianoacrilato: z.boolean(),
  naturalLashCondition: z.enum(NATURAL_KEYS).nullable(),
  lgpd: z.literal(true),
});

function fieldText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Cria ou atualiza a anamnese; assinatura nova (PNG) gera novo ConsentSignature. */
export async function saveAnamnesisAction(
  _prev: AnamnesisState,
  formData: FormData,
): Promise<AnamnesisState> {
  const professional = await requireProfessional();

  // ── Monta as respostas a partir do form ──
  const respostas = {} as Record<AnamnesisQuestionId, AnamnesisAnswer>;
  for (const q of ANAMNESIS_QUESTIONS) {
    const raw = formData.get(`q_${q.id}`);
    if (raw !== "sim" && raw !== "nao") {
      return { error: "Responda todas as perguntas antes de salvar." };
    }
    respostas[q.id] = {
      sim: raw === "sim",
      detalhe: raw === "sim" ? fieldText(formData, `d_${q.id}`) : "",
    };
  }

  const naturalRaw = fieldText(formData, "naturalLashCondition");
  const parsed = payloadSchema.safeParse({
    clientId: fieldText(formData, "clientId"),
    respostas,
    alergiaCianoacrilato: formData.get("alergiaCianoacrilato") === "1",
    naturalLashCondition: naturalRaw || null,
    lgpd: formData.get("lgpd") === "1" ? true : undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path.includes("lgpd")) {
      return { error: "É preciso autorizar o armazenamento dos dados (LGPD) para salvar." };
    }
    return { error: issue?.message ?? "Confira os campos e tente novamente." };
  }
  const { clientId, alergiaCianoacrilato, naturalLashCondition } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, professionalId: professional.id },
    select: { id: true },
  });
  if (!client) return { error: "Cliente não encontrada." };

  // ── Assinatura (obrigatória no primeiro preenchimento) ──
  const file = formData.get("assinatura");
  let signaturePng: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "image/png") {
      return { error: "Assinatura inválida — limpe e assine novamente." };
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      return { error: "Assinatura muito pesada — limpe e assine novamente." };
    }
    signaturePng = Buffer.from(await file.arrayBuffer());
  }
  if (!signaturePng) {
    const existentes = await prisma.consentSignature.count({
      where: { clientId: client.id, professionalId: professional.id },
    });
    if (existentes === 0) {
      return { error: "Colha a assinatura da cliente para concluir a anamnese." };
    }
  }

  // ── Flags de contraindicação (mesmas chaves de contraindications.ts) ──
  const temAlergiaCiano = respostas.alergias.sim && alergiaCianoacrilato;
  const flags: string[] = [];
  for (const q of ANAMNESIS_QUESTIONS) {
    if (q.flag && respostas[q.id].sim) flags.push(q.flag);
    if (q.id === "alergias" && temAlergiaCiano) flags.push(FLAG_ALERGIA_CIANOACRILATO);
  }

  const answersJson = JSON.stringify({
    versao: 1,
    respostas,
    alergiaCianoacrilato: temAlergiaCiano,
  });

  const data = {
    answersJson,
    contraindicationFlags: JSON.stringify(flags),
    hasContraindication: flags.length > 0,
    naturalLashCondition,
    lgpdConsent: true,
  };

  const form = await prisma.anamnesisForm.upsert({
    where: { clientId: client.id },
    create: { professionalId: professional.id, clientId: client.id, ...data },
    update: data,
  });

  if (signaturePng) {
    const imageKey = newStorageKey(professional.id, "assinaturas", "image/png");
    await getStorageProvider().put(imageKey, signaturePng, "image/png");
    await prisma.consentSignature.create({
      data: {
        professionalId: professional.id,
        clientId: client.id,
        anamnesisFormId: form.id,
        imageKey,
        // Snapshot do termo vigente no momento da assinatura.
        consentText: professional.consentText?.trim() || DEFAULT_CONSENT_TEXT,
      },
    });
  }

  revalidatePath(`/clientes/${client.id}`);
  revalidatePath(`/clientes/${client.id}/anamnese`);
  redirect(`/clientes/${client.id}/anamnese`);
}

export type ConsentTextState = { error?: string; ok?: boolean };

const consentSchema = z.object({
  clientId: z.string().min(1),
  texto: z.string().max(4000, "Termo muito longo (máximo 4.000 caracteres)."),
});

/** Salva o termo de consentimento personalizado (vazio volta ao padrão). */
export async function saveConsentTextAction(
  _prev: ConsentTextState,
  formData: FormData,
): Promise<ConsentTextState> {
  const professionalId = await requireProfessionalId();

  const parsed = consentSchema.safeParse({
    clientId: fieldText(formData, "clientId"),
    texto: typeof formData.get("texto") === "string" ? String(formData.get("texto")) : "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Confira o texto do termo." };
  }

  const texto = parsed.data.texto.trim();
  await prisma.professional.update({
    where: { id: professionalId },
    data: { consentText: texto || null },
  });

  revalidatePath(`/clientes/${parsed.data.clientId}/anamnese`);
  return { ok: true };
}
