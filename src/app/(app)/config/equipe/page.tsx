import { prisma } from "@/lib/prisma";
import { requireOwner, requireProfessional } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { EquipeManager } from "@/components/equipe/equipe-manager";
import type { MemberItem } from "@/components/equipe/types";

export const metadata = { title: "Equipe" };

/** Config → Equipe (só a dona): quem atende no estúdio, convites e acessos. */
export default async function EquipePage() {
  const { professionalId } = await requireOwner();
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const now = new Date();

  const [members, futuros] = await Promise.all([
    prisma.teamMember.findMany({
      where: { professionalId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        commissionPct: true,
        bookableOnline: true,
        active: true,
        passwordHash: true,
        inviteExpiresAt: true,
      },
    }),
    prisma.appointment.groupBy({
      by: ["memberId"],
      where: {
        professionalId,
        memberId: { not: null },
        startAt: { gte: now },
        status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      },
      _count: { _all: true },
    }),
  ]);

  const futurosPorMembro = new Map(futuros.map((f) => [f.memberId, f._count._all]));

  // Senha e hash do convite nunca saem do servidor: o client recebe só o estado.
  const items: MemberItem[] = members.map((m) => {
    const pending = m.passwordHash === null;
    const vence = m.inviteExpiresAt;
    const inviteExpired = pending && (!vence || vence.getTime() < now.getTime());
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      color: m.color,
      commissionPct: m.commissionPct,
      bookableOnline: m.bookableOnline,
      active: m.active,
      pending,
      inviteExpired,
      inviteLabel: !pending
        ? null
        : vence
          ? `${inviteExpired ? "Venceu em" : "Vale até"} ${formatDate(vence, tz)}`
          : "Sem convite ativo",
      futureCount: futurosPorMembro.get(m.id) ?? 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Quem atende com você. Cada uma entra com o próprio login."
        backHref="/config"
      />
      <EquipeManager
        owner={{
          name: professional.name,
          email: professional.email,
          ownerBookable: professional.ownerBookable,
        }}
        members={items}
      />
    </div>
  );
}
