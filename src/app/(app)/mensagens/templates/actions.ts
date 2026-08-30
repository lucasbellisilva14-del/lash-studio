"use server";

/** Server actions dos templates de mensagem (upsert por [professionalId, kind]). */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { TEMPLATE_KINDS, type TemplateKind } from "@/lib/constants";

const kindEnum = z.enum(
  Object.keys(TEMPLATE_KINDS) as [TemplateKind, ...TemplateKind[]],
);

export type SalvarTemplateState = {
  ok: boolean;
  error: string | null;
  /** timestamp da última gravação bem-sucedida (fecha o Sheet no cliente). */
  savedAt: number;
};

const saveSchema = z.object({
  kind: kindEnum,
  name: z.string().trim().min(1, "Informe o nome do template.").max(80, "Nome muito longo."),
  body: z
    .string()
    .trim()
    .min(1, "Escreva o corpo da mensagem.")
    .max(2000, "Mensagem muito longa (máx. 2000 caracteres)."),
  active: z.boolean(),
});

export async function salvarTemplate(
  _prev: SalvarTemplateState,
  formData: FormData,
): Promise<SalvarTemplateState> {
  const professionalId = await requireProfessionalId();

  const parsed = saveSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    body: formData.get("body"),
    active: formData.get("active") === "1",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      savedAt: 0,
    };
  }

  const { kind, name, body, active } = parsed.data;
  await prisma.messageTemplate.upsert({
    where: { professionalId_kind: { professionalId, kind } },
    update: { name, body, active },
    create: { professionalId, kind, name, body, active },
  });

  revalidatePath("/mensagens/templates");
  revalidatePath("/mensagens");
  return { ok: true, error: null, savedAt: Date.now() };
}

const toggleSchema = z.object({ kind: kindEnum, active: z.boolean() });

export async function alternarTemplate(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const professionalId = await requireProfessionalId();

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { kind, active } = parsed.data;

  const existing = await prisma.messageTemplate.findUnique({
    where: { professionalId_kind: { professionalId, kind } },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Edite e salve o template antes de ativar." };
  }

  await prisma.messageTemplate.update({
    where: { id: existing.id },
    data: { active },
  });

  revalidatePath("/mensagens/templates");
  revalidatePath("/mensagens");
  return { ok: true };
}
