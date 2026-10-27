"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/team";

export type RedefinirState = { ok?: boolean; error?: string };

const LINK_INVALIDO =
  "Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.";

/**
 * Troca a senha usando o token do e-mail (uso único, expira em 1h).
 * O token pode ser da dona (Professional) ou de alguém da equipe (TeamMember).
 */
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
  if (senha.length > 100) {
    return { error: "Senha muito longa." };
  }
  if (senha !== confirmar) {
    return { error: "As senhas não conferem — digite igual nos dois campos." };
  }
  if (!token) return { error: LINK_INVALIDO };

  const hash = hashToken(token);
  const agora = Date.now();

  const professional = await prisma.professional.findUnique({
    where: { resetTokenHash: hash },
  });
  if (professional) {
    if (!professional.resetTokenExpiresAt || professional.resetTokenExpiresAt.getTime() < agora) {
      return { error: LINK_INVALIDO };
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

  // Equipe: funcionária ativa (desativada não volta por aqui).
  const member = await prisma.teamMember.findUnique({
    where: { resetTokenHash: hash },
    select: { id: true, email: true, active: true, resetTokenExpiresAt: true },
  });
  if (!member || !member.active || !member.resetTokenExpiresAt || member.resetTokenExpiresAt.getTime() < agora) {
    return { error: LINK_INVALIDO };
  }

  await prisma.$transaction([
    prisma.teamMember.update({
      where: { id: member.id },
      data: {
        passwordHash: await bcrypt.hash(senha, 10),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    }),
    prisma.loginAttempt.deleteMany({ where: { email: member.email } }),
  ]);

  return { ok: true };
}
