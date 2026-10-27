"use server";

/**
 * Server actions da anamnese digital (dados sensíveis de saúde).
 * Multi-tenant: toda consulta filtra por professionalId.
 * Equipe: a funcionária preenche a anamnese das clientes do escopo dela; o
 * termo de consentimento vale para o estúdio todo e só a dona edita.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireProfessional, requireViewer } from "@/lib/session";
import { clientScope } from "@/lib/team";
import { getStorageProvider, newStorageKey } from "@/lib/providers/storage";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import {
  ANAMNESIS_LIMITS,
  anamnesisQuestionsOrDefault,
  computeContraindications,
  serializeAnamnesisAnswers,
  serializeAnamnesisQuestions,
  validateAnamnesisModel,
  type AnamnesisAnswer,
  type AnamnesisAnswers,
  type AnamnesisQuestion,
} from "@/lib/domain/anamnesis-model";
import { DEFAULT_CONSENT_TEXT } from "@/components/anamnese/questions";

export type AnamnesisState = {
  error?: string;
  /** Ids das perguntas obrigatórias sem resposta (o formulário destaca). */
  missing?: string[];
};

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

const NATURAL_KEYS = Object.keys(NATURAL_LASH_CONDITIONS) as [string, ...string[]];

const payloadSchema = z.object({
  clientId: z.string().min(1, "Cliente inválida."),
  naturalLashCondition: z.enum(NATURAL_KEYS).nullable(),
  lgpd: z.literal(true),
});

function fieldText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Perguntas que a tela mostrou (retrato do dia), validadas. Se não vierem ou
 * não passarem na validação, vale o modelo atual da profissional.
 */
function questionsFromForm(
  formData: FormData,
  professionalModelJson: string | null,
): AnamnesisQuestion[] {
  const raw = formData.get("modelo");
  if (typeof raw === "string" && raw) {
    try {
      const result = validateAnamnesisModel(JSON.parse(raw));
      if (result.ok) return result.questions;
    } catch {
      // JSON inválido: segue com o modelo atual.
    }
  }
  return anamnesisQuestionsOrDefault(professionalModelJson);
}

function tooLong(question: AnamnesisQuestion, max: number): string {
  return `A resposta de “${question.text}” passou de ${max} caracteres.`;
}

/** Cria ou atualiza a anamnese; assinatura nova (PNG) gera novo ConsentSignature. */
export async function saveAnamnesisAction(
  _prev: AnamnesisState,
  formData: FormData,
): Promise<AnamnesisState> {
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const L = ANAMNESIS_LIMITS;

  // ── Perguntas e respostas ──
  const questions = questionsFromForm(formData, professional.anamnesisQuestionsJson);
  const answers: AnamnesisAnswers = {};
  const missing: AnamnesisQuestion[] = [];

  for (const question of questions) {
    const value = fieldText(formData, `q_${question.id}`);
    let answer: AnamnesisAnswer | null = null;

    if (question.type === "SIM_NAO") {
      if (value === "sim" || value === "nao") {
        const detalhe =
          value === "sim" && question.followUp ? fieldText(formData, `d_${question.id}`) : "";
        if (detalhe.length > L.detail) return { error: tooLong(question, L.detail) };
        answer = { sim: value === "sim", detalhe };
      }
    } else if (question.type === "ESCOLHA") {
      if (value && (question.options ?? []).includes(value)) answer = { opcao: value };
    } else if (value) {
      const max = question.type === "TEXTO_CURTO" ? L.shortAnswer : L.longAnswer;
      if (value.length > max) return { error: tooLong(question, max) };
      answer = { texto: value };
    }

    if (answer) answers[question.id] = answer;
    else if (question.required) missing.push(question);
  }

  if (missing.length > 0) {
    return {
      error:
        missing.length === 1
          ? `Responda a pergunta “${missing[0].text}”.`
          : `Faltam ${missing.length} respostas obrigatórias, a começar por “${missing[0].text}”.`,
      missing: missing.map((q) => q.id),
    };
  }

  const naturalRaw = fieldText(formData, "naturalLashCondition");
  const parsed = payloadSchema.safeParse({
    clientId: fieldText(formData, "clientId"),
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
  const { clientId, naturalLashCondition } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, professionalId: professional.id, ...clientScope(viewer) },
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

  // ── Contraindicações: perguntas com alerta respondidas "sim" ──
  const { flags, hasContraindication } = computeContraindications(questions, answers);

  const data = {
    answersJson: serializeAnamnesisAnswers(questions, answers),
    // Retrato das perguntas como foram feitas hoje: mudar o modelo depois não altera esta anamnese.
    questionsSnapshotJson: serializeAnamnesisQuestions(questions),
    contraindicationFlags: JSON.stringify(flags),
    hasContraindication,
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

/** Salva o termo de consentimento personalizado (vazio volta ao padrão). Só a dona. */
export async function saveConsentTextAction(
  _prev: ConsentTextState,
  formData: FormData,
): Promise<ConsentTextState> {
  const { professionalId } = await requireOwner();

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
