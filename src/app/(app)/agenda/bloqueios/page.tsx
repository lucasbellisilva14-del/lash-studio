import type { Metadata } from "next";
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { BlocksManager } from "@/components/agenda/blocks-manager";
import { toAgendaBloqueio } from "../data";

export const metadata: Metadata = { title: "Bloqueios de agenda" };

export default async function BloqueiosPage() {
  const professional = await requireProfessional();
  const blocks = await prisma.scheduleBlock.findMany({
    where: { professionalId: professional.id },
    orderBy: [{ type: "asc" }, { weekday: "asc" }, { startAt: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Bloqueios"
        subtitle="Almoço, folgas, férias — horários fechados na agenda"
        backHref="/agenda"
      />
      <BlocksManager
        bloqueios={blocks.map(toAgendaBloqueio)}
        tz={professional.timezone}
      />
    </div>
  );
}
