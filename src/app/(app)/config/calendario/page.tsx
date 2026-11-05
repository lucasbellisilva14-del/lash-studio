import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer } from "@/lib/session";
import { getAppOrigin } from "@/lib/domain/queue";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarioManager } from "./calendario-manager";

export const metadata = { title: "Agenda no calendário" };

/** Dona: a agenda do estúdio inteiro. Funcionária: só os horários dela. */
export default async function CalendarioPage() {
  const viewer = await requireViewer();
  const professional = await requireProfessional();

  const token = viewer.isOwner
    ? professional.calendarToken
    : (
        await prisma.teamMember.findFirst({
          where: { id: viewer.memberId!, professionalId: viewer.professionalId },
          select: { calendarToken: true },
        })
      )?.calendarToken ?? null;
  const feedUrl = token ? `${await getAppOrigin()}/api/calendario/${token}` : null;

  return (
    <div>
      <PageHeader
        title="Agenda no calendário"
        subtitle={
          viewer.isOwner
            ? "Os atendimentos do estúdio no Google Agenda ou no iPhone."
            : "Os seus atendimentos no Google Agenda ou no iPhone."
        }
        backHref="/config"
      />
      <CalendarioManager feedUrl={feedUrl} isOwner={viewer.isOwner} />
    </div>
  );
}
