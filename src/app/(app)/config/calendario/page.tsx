import { headers } from "next/headers";
import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarioManager } from "./calendario-manager";

export const metadata = { title: "Agenda no calendário" };

export default async function CalendarioPage() {
  const professional = await requireProfessional();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const feedUrl = professional.calendarToken
    ? `${proto}://${host}/api/calendario/${professional.calendarToken}`
    : null;

  return (
    <div>
      <PageHeader
        title="Agenda no calendário"
        subtitle="Seus atendimentos no Google Calendar ou no iPhone"
        backHref="/config"
      />
      <CalendarioManager feedUrl={feedUrl} />
    </div>
  );
}
