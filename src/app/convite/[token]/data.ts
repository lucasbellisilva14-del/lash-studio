import "server-only";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/team";

/**
 * Convite válido: token confere (só o hash fica no banco), não venceu, a
 * funcionária está ativa e ainda não criou a senha. Senão, null.
 */
export async function buscarConvite(token: string) {
  if (!token || token.length > 200) return null;
  const member = await prisma.teamMember.findUnique({
    where: { inviteTokenHash: hashToken(token) },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      passwordHash: true,
      inviteExpiresAt: true,
      professional: {
        select: { name: true, studioName: true, slug: true, logoUrl: true },
      },
    },
  });
  if (
    !member ||
    !member.active ||
    member.passwordHash !== null ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt.getTime() < Date.now()
  ) {
    return null;
  }
  return member;
}
