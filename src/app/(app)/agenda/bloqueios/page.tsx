import type { Metadata } from "next";
import { requireProfessional, requireViewer } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { OWNER_KEY } from "@/lib/team-shared";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BlocksManager, type OpcaoPara } from "@/components/agenda/blocks-manager";
import { ESTUDIO_KEY, rotulosDaEquipe } from "@/components/agenda/pro";
import { toAgendaBloqueio } from "../data";

export const metadata: Metadata = { title: "Bloqueios de agenda" };

/**
 * Bloqueios de agenda. A dona vê e cria para o estúdio inteiro, para ela ou
 * para cada funcionária; a funcionária vê e mexe só nos dela.
 */
export default async function BloqueiosPage() {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const team = await getTeam(professional.id);
  const comEquipe = viewer.isOwner && team.length > 1;

  const blocks = await prisma.scheduleBlock.findMany({
    where: {
      professionalId: professional.id,
      ...(viewer.isOwner ? {} : { memberId: viewer.memberId, allTeam: false }),
    },
    orderBy: [{ type: "asc" }, { weekday: "asc" }, { startAt: "asc" }],
  });

  // Bloqueios de quem saiu da equipe não valem para ninguém: ficam guardados
  // (voltam a valer se ela for reativada), mas fora da lista.
  const ativas = new Set(team.map((p) => p.memberId));
  const visiveis = blocks.filter((b) => b.allTeam || ativas.has(b.memberId));

  const rotulos = rotulosDaEquipe(team, viewer.memberId);
  const corDe = new Map(team.map((p) => [p.memberId, p.color]));
  const bloqueios = visiveis.map((b) => {
    if (!comEquipe) return toAgendaBloqueio(b);
    const para = b.allTeam ? "Estúdio inteiro" : (rotulos.get(b.memberId ?? OWNER_KEY) ?? null);
    return {
      ...toAgendaBloqueio(b, para),
      paraCor: b.allTeam ? null : (corDe.get(b.memberId) ?? null),
    };
  });

  const opcoesPara: OpcaoPara[] = comEquipe
    ? [
        { key: ESTUDIO_KEY, rotulo: "Estúdio inteiro", cor: null },
        ...team.map((p) => ({ key: p.key, rotulo: rotulos.get(p.key) ?? p.name, cor: p.color })),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Bloqueios"
        subtitle={
          viewer.isOwner
            ? "Almoço, folgas, férias — horários fechados na agenda"
            : "Almoço, folgas, férias — horários fechados na sua agenda"
        }
        backHref="/agenda"
      />
      <BlocksManager bloqueios={bloqueios} tz={professional.timezone} opcoesPara={opcoesPara} />
    </div>
  );
}
