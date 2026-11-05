/**
 * Feed iCalendar (.ics) da agenda — assinável no Google Agenda / iPhone.
 * Token da dona (Professional.calendarToken): o estúdio inteiro, com o nome da
 * profissional quando há equipe. Token da funcionária (TeamMember.calendarToken):
 * só os horários dela. Regerar o token em Configurações revoga o link antigo.
 */
import { prisma } from "@/lib/prisma";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { firstName } from "@/lib/team-shared";
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

type Dono = {
  professionalId: string;
  studioName: string;
  addressLine: string | null;
  ownerName: string;
  /** Feed de uma funcionária: só os horários dela. Nulo = a agenda do estúdio. */
  member: { id: string; name: string } | null;
};

async function donoDoToken(token: string): Promise<Dono | null> {
  const professional = await prisma.professional.findUnique({
    where: { calendarToken: token },
    select: { id: true, studioName: true, addressLine: true, name: true },
  });
  if (professional) {
    return {
      professionalId: professional.id,
      studioName: professional.studioName,
      addressLine: professional.addressLine,
      ownerName: professional.name,
      member: null,
    };
  }
  // Funcionária desativada: o link para de funcionar junto com o acesso.
  const member = await prisma.teamMember.findUnique({
    where: { calendarToken: token },
    select: {
      id: true,
      name: true,
      active: true,
      professional: { select: { id: true, studioName: true, addressLine: true, name: true } },
    },
  });
  if (!member?.active) return null;
  return {
    professionalId: member.professional.id,
    studioName: member.professional.studioName,
    addressLine: member.professional.addressLine,
    ownerName: member.professional.name,
    member: { id: member.id, name: member.name },
  };
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/calendario/[token]">,
) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return new Response("não encontrado", { status: 404 });
  }

  const dono = await donoDoToken(token);
  if (!dono) {
    return new Response("não encontrado", { status: 404 });
  }

  const now = new Date();
  const [appointments, equipe] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        professionalId: dono.professionalId,
        ...(dono.member ? { memberId: dono.member.id } : {}),
        status: { in: ["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO"] },
        startAt: { gte: subDays(now, 30), lte: addDays(now, 120) },
      },
      orderBy: { startAt: "asc" },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
        member: { select: { name: true } },
      },
    }),
    // Só a agenda do estúdio precisa saber se há equipe (para nomear a profissional).
    dono.member ? Promise.resolve(0) : prisma.teamMember.count({ where: { professionalId: dono.professionalId } }),
  ]);
  const comEquipe = !dono.member && equipe > 0;

  const statusLabel = (s: string) =>
    (APPOINTMENT_STATUSES as Record<string, string>)[s] ?? s;

  const nomeDaAgenda = dono.member
    ? `${dono.studioName} · ${firstName(dono.member.name)}`
    : `${dono.studioName} · LashOS`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LashOS//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(nomeDaAgenda)}`),
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const a of appointments) {
    const quem = firstName(a.member?.name ?? dono.ownerName);
    const summary = comEquipe
      ? `${quem} · ${a.client.name} — ${a.service.name}`
      : `${a.client.name} — ${a.service.name}`;
    const description = comEquipe
      ? `Com ${a.member?.name ?? dono.ownerName}\nStatus: ${statusLabel(a.status)}`
      : `Status: ${statusLabel(a.status)}`;
    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${a.id}@lashos`),
      `DTSTAMP:${icsDate(a.updatedAt ?? a.startAt)}`,
      `DTSTART:${icsDate(a.startAt)}`,
      `DTEND:${icsDate(a.endAt)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      ...(dono.addressLine ? [fold(`LOCATION:${esc(dono.addressLine)}`)] : []),
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
