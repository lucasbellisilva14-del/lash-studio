"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { type ConfigFormState, fieldErrorsFrom } from "../form-state";

const schema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a sua senha atual."),
    novaSenha: z
      .string()
      .min(8, "A nova senha precisa de pelo menos 8 caracteres.")
      .max(100, "Senha muito longa."),
    confirmarSenha: z.string(),
  })
  .refine((v) => v.novaSenha === v.confirmarSenha, {
    path: ["confirmarSenha"],
    message: "A confirmação não confere com a nova senha.",
  });

export async function trocarSenhaAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const professionalId = await requireProfessionalId();

  const parsed = schema.safeParse({
    senhaAtual: String(formData.get("senhaAtual") ?? ""),
    novaSenha: String(formData.get("novaSenha") ?? ""),
    confirmarSenha: String(formData.get("confirmarSenha") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { passwordHash: true },
  });
  if (!professional) {
    return { ok: false, error: "Sessão inválida — entre novamente." };
  }

  const confere = await bcrypt.compare(parsed.data.senhaAtual, professional.passwordHash);
  if (!confere) {
    return {
      ok: false,
      error: "Revise os campos destacados.",
      fieldErrors: { senhaAtual: "Senha atual incorreta." },
    };
  }

  await prisma.professional.update({
    where: { id: professionalId },
    data: { passwordHash: bcrypt.hashSync(parsed.data.novaSenha, 10) },
  });

  return { ok: true, savedAt: Date.now() };
}
