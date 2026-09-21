"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type RedefinirState = { ok?: boolean; error?: string };

/** Troca a senha usando o token do e-mail (uso único, expira em 1h). */
export async function redefinirSenha(
  _prev: RedefinirState,
  formData: FormData,
): Promise<RedefinirState> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (senha.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (senha !== confirmar) {
    return { error: "As senhas não conferem — digite igual nos dois campos." };
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const professional = await prisma.professional.findUnique({
    where: { resetTokenHash: hash },
  });
  if (
    !professional ||
    !professional.resetTokenExpiresAt ||
    professional.resetTokenExpiresAt.getTime() < Date.now()
  ) {
    return {
      error: "Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.",
    };
  }

  await prisma.$transaction([
    prisma.professional.update({
      where: { id: professional.id },
      data: {
        passwordHash: bcrypt.hashSync(senha, 10),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    }),
    // zera o freio de força bruta — a dona da conta voltou
    prisma.loginAttempt.deleteMany({ where: { email: professional.email } }),
  ]);

  return { ok: true };
}
