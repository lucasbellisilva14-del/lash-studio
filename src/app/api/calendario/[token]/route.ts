/**
 * Feed iCalendar (.ics) da agenda — assinável no Google Calendar / iPhone.
 * Protegido pelo calendarToken secreto de cada profissional; regerar o token
 * em Configurações → Agenda no calendário revoga o link antigo.
 */
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { addDays, subDays } from "date-fns";

export const dynamic = "force-dynamic";

/** Texto seguro para iCalendar: escapa \ ; , e quebras de linha. */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Instante UTC no formato iCal: 20260921T143000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Dobra linhas longas em 74 octetos (RFC 5545). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/calendario/[token]">,
) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return new Response("não encontrado", { status: 404 });
  }

  const professional = await prisma.professional.findUnique({
    where: { calendarToken: token },
    select: { id: true, studioName: true, addressLine: true },
  });
  if (!professional) {
    return new Response("não encontrado", { status: 404 });
  }

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: professional.id,
      status: { in: ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO"] },
      startAt: { gte: subDays(now, 30), lte: addDays(now, 120) },
    },
    orderBy: { startAt: "asc" },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  const statusLabel = (s: string) =>
    (APPOINTMENT_STATUSES as Record<string, string>)[s] ?? s;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LashOS//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(professional.studioName)} · LashOS`),
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const a of appointments) {
    const summary = `${a.client.name} — ${a.service.name}`;
    const description = `Status: ${statusLabel(a.status)}`;
    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${a.id}@lashos`),
      `DTSTAMP:${icsDate(a.updatedAt ?? a.startAt)}`,
      `DTSTART:${icsDate(a.startAt)}`,
      `DTEND:${icsDate(a.endAt)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      ...(professional.addressLine ? [fold(`LOCATION:${esc(professional.addressLine)}`)] : []),
      `STATUS:${a.status === "PRE_AGENDADO" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda-lashos.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
