import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Toda página e server action protegida usa estes helpers.
 * Multi-tenant: SEMPRE filtrar consultas por professionalId (= o estúdio).
 *
 * Equipe: quem está logada é a dona (memberId nulo) ou uma funcionária
 * (memberId). O professionalId é sempre o do estúdio. Telas e ações só da
 * dona usam requireOwner(); telas que a funcionária também usa partem de
 * requireViewer() e filtram com os escopos de @/lib/team.
 */

export type Viewer = {
  /** O estúdio (tenant). */
  professionalId: string;
  /** Nulo = a dona do estúdio; senão, a funcionária logada. */
  memberId: string | null;
  isOwner: boolean;
  /** Nome de quem está logada. */
  name: string;
};

export const requireViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  const professionalId = session?.user?.id;
  if (!professionalId) redirect("/login");
  const memberId = (session.user as { memberId?: string | null }).memberId ?? null;
  if (!memberId) {
    return { professionalId, memberId: null, isOwner: true, name: session.user?.name ?? "" };
  }
  // Funcionária desativada perde o acesso na hora, mesmo com sessão válida.
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, professionalId, active: true },
    select: { name: true },
  });
  if (!member) redirect("/sair?motivo=acesso");
  return { professionalId, memberId, isOwner: false, name: member.name };
});

export const requireProfessionalId = cache(async (): Promise<string> => {
  return (await requireViewer()).professionalId;
});

/** O estúdio (dados, políticas, assinatura). Vale para a dona e para a equipe. */
export const requireProfessional = cache(async () => {
  const id = await requireProfessionalId();
  const professional = await prisma.professional.findUnique({ where: { id } });
  if (!professional) redirect("/login");
  return professional;
});

/** Telas e ações só da dona. A funcionária volta para o início. */
export const requireOwner = cache(async (): Promise<Viewer> => {
  const viewer = await requireViewer();
  if (!viewer.isOwner) redirect("/");
  return viewer;
});
