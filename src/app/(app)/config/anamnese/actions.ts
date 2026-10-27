"use server";

/**
 * Modelo de anamnese da profissional (Professional.anamnesisQuestionsJson).
 * Nulo = segue o modelo padrão do LashOS. Anamneses já respondidas não são
 * tocadas: cada uma guarda o retrato das perguntas do dia.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import {
  getDefaultAnamnesisModel,
  isDefaultAnamnesisModel,
  serializeAnamnesisQuestions,
  validateAnamnesisModel,
  type AnamnesisQuestion,
} from "@/lib/domain/anamnesis-model";

export type AnamnesisModelState = {
  ok: boolean;
  /** Erro geral (aparece na barra de salvar). */
  error?: string;
  /** Erro por pergunta (chave = id da pergunta enviada). */
  questionErrors?: Record<string, string>;
  /** Momento do último salvamento: o editor troca o rascunho pelo que foi gravado. */
  savedAt?: number;
  message?: string;
  /** Perguntas como ficaram gravadas (normalizadas, com ids definitivos). */
  questions?: AnamnesisQuestion[];
  /** true quando o modelo em vigor é o padrão do LashOS. */
  usingDefault?: boolean;
};

function readJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Salva o modelo editado ou, com intencao=restaurar, volta ao padrão. */
export async function saveAnamnesisModelAction(
  _prev: AnamnesisModelState,
  formData: FormData,
): Promise<AnamnesisModelState> {
  const professionalId = await requireProfessionalId();

  if (formData.get("intencao") === "restaurar") {
    try {
      await prisma.professional.update({
        where: { id: professionalId },
        data: { anamnesisQuestionsJson: null },
      });
    } catch {
      return { ok: false, error: "Não foi possível restaurar agora. Tente de novo." };
    }
    revalidatePath("/config/anamnese");
    revalidatePath("/config");
    return {
      ok: true,
      savedAt: Date.now(),
      message: "Modelo padrão restaurado",
      questions: getDefaultAnamnesisModel(),
      usingDefault: true,
    };
  }

  const result = validateAnamnesisModel(readJson(formData.get("perguntas")));
  if (!result.ok) {
    return { ok: false, error: result.error, questionErrors: result.questionErrors };
  }

  // Igual ao padrão → grava nulo e continua acompanhando o padrão do LashOS.
  const usingDefault = isDefaultAnamnesisModel(result.questions);
  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        anamnesisQuestionsJson: usingDefault ? null : serializeAnamnesisQuestions(result.questions),
      },
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar agora. Tente de novo." };
  }

  revalidatePath("/config/anamnese");
  revalidatePath("/config");
  return {
    ok: true,
    savedAt: Date.now(),
    message: "Modelo salvo",
    questions: result.questions,
    usingDefault,
  };
}
