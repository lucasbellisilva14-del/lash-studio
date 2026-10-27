"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
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

const SENHA_ATUAL_ERRADA: ConfigFormState = {
  ok: false,
  error: "Revise os campos destacados.",
  fieldErrors: { senhaAtual: "Senha atual incorreta." },
};

/**
 * Troca a senha de quem está logada: a dona (Professional) ou a funcionária
 * (TeamMember do mesmo estúdio). Sempre confere a senha atual.
 */
export async function trocarSenhaAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const viewer = await requireViewer();

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

  if (!viewer.isOwner) {
    const member = await prisma.teamMember.findFirst({
      where: { id: viewer.memberId ?? "", professionalId: viewer.professionalId, active: true },
      select: { id: true, passwordHash: true },
    });
    if (!member?.passwordHash) {
      return { ok: false, error: "Sessão inválida — entre novamente." };
    }

    const confere = await bcrypt.compare(parsed.data.senhaAtual, member.passwordHash);
    if (!confere) return SENHA_ATUAL_ERRADA;

    await prisma.teamMember.update({
      where: { id: member.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.novaSenha, 10) },
    });
    return { ok: true, savedAt: Date.now() };
  }

  const professional = await prisma.professional.findUnique({
    where: { id: viewer.professionalId },
    select: { passwordHash: true },
  });
  if (!professional) {
    return { ok: false, error: "Sessão inválida — entre novamente." };
  }

  const confere = await bcrypt.compare(parsed.data.senhaAtual, professional.passwordHash);
  if (!confere) return SENHA_ATUAL_ERRADA;

  await prisma.professional.update({
    where: { id: viewer.professionalId },
    data: { passwordHash: bcrypt.hashSync(parsed.data.novaSenha, 10) },
  });

  return { ok: true, savedAt: Date.now() };
}
