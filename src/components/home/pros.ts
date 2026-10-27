import "server-only";

/**
 * Nomes e cores de quem atende, para rotular horários, avisos e histórico.
 * Sem equipe ativa (hasTeam falso) nenhuma tela mostra nome de profissional.
 * Memoizado por request: home e coluna do PC dividem a mesma consulta.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/team";
import { firstName, OWNER_COLOR, proLabel } from "@/lib/team-shared";
import type { ProView } from "./pro-avatar";

export type ProInfo = { memberId: string | null; name: string; color: string };

export type ProDirectory = {
  hasTeam: boolean;
  /** Quem atende (nulo = a dona). Inclui funcionárias desativadas, por causa do histórico. */
  of: (memberId: string | null) => ProInfo;
};

export const getProDirectory = cache(async (professionalId: string): Promise<ProDirectory> => {
  const team = await getTeam(professionalId);
  const owner: ProInfo = {
    memberId: null,
    name: team[0]?.name ?? "Dona do estúdio",
    color: OWNER_COLOR,
  };
  if (team.length <= 1) return { hasTeam: false, of: () => owner };

  const members = await prisma.teamMember.findMany({
    where: { professionalId },
    select: { id: true, name: true, color: true },
  });
  const byId = new Map<string, ProInfo>(
    members.map((m) => [m.id, { memberId: m.id, name: m.name, color: m.color }]),
  );
  return {
    hasTeam: true,
    of: (memberId) => (memberId ? (byId.get(memberId) ?? owner) : owner),
  };
});

/** Avatar + "Você" (quem está logada) ou o primeiro nome. */
export function proView(pro: ProInfo, viewerMemberId: string | null): ProView {
  return { name: pro.name, color: pro.color, label: proLabel(pro, viewerMemberId) };
}

/** Avatar + "com você" / "com Ana". */
export function withProView(pro: ProInfo, viewerMemberId: string | null): ProView {
  return {
    name: pro.name,
    color: pro.color,
    label: pro.memberId === viewerMemberId ? "com você" : `com ${firstName(pro.name)}`,
  };
}
