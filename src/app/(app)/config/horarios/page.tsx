import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { HorariosForm, type DayDefaults } from "./horarios-form";

export const metadata = { title: "Horários de atendimento" };

export default async function HorariosPage() {
  const professional = await requireProfessional();

  const hours = await prisma.workingHour.findMany({
    where: { professionalId: professional.id },
  });
  const byDay = new Map(hours.map((h) => [h.weekday, h]));

  const days: DayDefaults[] = Array.from({ length: 7 }, (_, weekday) => {
    const saved = byDay.get(weekday);
    return {
      weekday,
      active: saved?.active ?? false,
      startTime: saved?.startTime ?? "09:00",
      endTime: saved?.endTime ?? "18:00",
    };
  });

  return (
    <div>
      <PageHeader
        title="Horários"
        subtitle="Dias e janelas em que você atende"
        backHref="/config"
      />
      <HorariosForm
        days={days}
        bufferMinutes={professional.bufferMinutes}
        minAdvanceHours={professional.minAdvanceHours}
      />
    </div>
  );
}
