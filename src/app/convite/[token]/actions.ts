"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { hashToken } from "@/lib/team";
import { buscarConvite } from "./data";

export type ConviteState = {
  error?: string;
  /** O convite não vale mais: a tela troca para a mensagem de convite vencido. */
  expirado?: boolean;
  /** Senha criada, mas o login automático falhou: ela entra pela tela de login. */
  criada?: boolean;
};

const EXPIRADO =
  "Este convite expirou ou já foi usado. Peça um novo para a responsável pelo estúdio.";

/**
 * A funcionária cria a senha pelo convite: grava a senha, invalida o convite
 * (uso único), zera o freio de login do e-mail e já entra no app.
 */
export async function aceitarConviteAction(
  _prev: ConviteState,
  formData: FormData,
): Promise<ConviteState> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (senha.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha.length > 100) return { error: "Senha muito longa." };
  if (senha !== confirmar) return { error: "As senhas não conferem. Digite igual nos dois campos." };

  const convite = await buscarConvite(token);
  if (!convite) return { error: EXPIRADO, expirado: true };

  // Raro: o e-mail virou login de um estúdio depois do convite.
  const conflito = await prisma.professional.findUnique({
    where: { email: convite.email },
    select: { id: true },
  });
  if (conflito) {
    return {
      error:
        "Este e-mail já é o login de outra conta do LashOS. Peça para a responsável pelo estúdio trocar o e-mail do seu convite.",
    };
  }

  // Uso único: só grava se o convite ainda é este (dois envios ao mesmo tempo não passam).
  const gravado = await prisma.teamMember.updateMany({
    where: {
      id: convite.id,
      inviteTokenHash: hashToken(token),
      passwordHash: null,
      active: true,
    },
    data: {
      passwordHash: await bcrypt.hash(senha, 10),
      inviteTokenHash: null,
      inviteExpiresAt: null,
    },
  });
  if (gravado.count === 0) return { error: EXPIRADO, expirado: true };

  await prisma.loginAttempt.deleteMany({ where: { email: convite.email } }).catch(() => {});

  try {
    await signIn("credentials", {
      email: convite.email,
      password: senha,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error; // entrou → vai para o app
    if (error instanceof AuthError) return { criada: true };
    throw error;
  }
}
