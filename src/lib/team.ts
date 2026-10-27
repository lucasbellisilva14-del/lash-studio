import "server-only";

/**
 * Equipe — consultas e escopos de acesso (server). Regras:
 * - memberId nulo = a dona; a dona vê e faz tudo no estúdio.
 * - A funcionária vê só os agendamentos dela, as clientes que cadastrou ou com
 *   quem tem/teve horário, e os números dela. Nada de configurações, despesas,
 *   estoque, relatórios do estúdio ou assinatura.
 */
import crypto from "node:crypto";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/session";
import { OWNER_COLOR, OWNER_KEY, type TeamPro } from "@/lib/team-shared";

/** Profissionais do estúdio: a dona primeiro, depois a equipe ativa (ordem de cadastro). */
export const getTeam = cache(async (professionalId: string): Promise<TeamPro[]> => {
  const [professional, members] = await Promise.all([
    prisma.professional.findUnique({
      where: { id: professionalId },
      select: { name: true, ownerBookable: true },
    }),
    prisma.teamMember.findMany({
      where: { professionalId, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true, bookableOnline: true, commissionPct: true },
    }),
  ]);
  const owner: TeamPro = {
    key: OWNER_KEY,
    memberId: null,
    name: professional?.name ?? "Dona do estúdio",
    color: OWNER_COLOR,
    isOwner: true,
    bookableOnline: professional?.ownerBookable ?? true,
    commissionPct: 0,
  };
  return [
    owner,
    ...members.map((m) => ({
      key: m.id,
      memberId: m.id,
      name: m.name,
      color: m.color,
      isOwner: false,
      bookableOnline: m.bookableOnline,
      commissionPct: m.commissionPct,
    })),
  ];
});

/** Sem equipe ativa, nenhuma tela mostra seletor ou nome de profissional. */
export async function hasTeam(professionalId: string): Promise<boolean> {
  return (await getTeam(professionalId)).length > 1;
}

/** Agendamentos visíveis: a dona vê todos; a funcionária, só os dela. */
export function appointmentScope(viewer: Viewer): Prisma.AppointmentWhereInput {
  return viewer.isOwner ? {} : { memberId: viewer.memberId };
}

/** Pode mexer neste agendamento? (a dona sempre; a funcionária só nos dela) */
export function canActOnAppointment(viewer: Viewer, appointment: { memberId: string | null }): boolean {
  return viewer.isOwner || appointment.memberId === viewer.memberId;
}

/**
 * Clientes visíveis: a dona vê todas; a funcionária, as que cadastrou ou com
 * quem tem/teve horário. Horário cancelado não conta (marcar e cancelar não
 * dá acesso à ficha).
 */
export function clientScope(viewer: Viewer): Prisma.ClientWhereInput {
  if (viewer.isOwner) return {};
  return {
    OR: [
      { createdByMemberId: viewer.memberId },
      {
        appointments: {
          some: { memberId: viewer.memberId, status: { notIn: ["CANCELADO", "CANCELADO_TARDE"] } },
        },
      },
    ],
  };
}

/** Bloqueios que valem para uma profissional (nulo = a dona): os dela + os do estúdio inteiro. */
export function blockScopeFor(memberId: string | null): Prisma.ScheduleBlockWhereInput {
  return { OR: [{ allTeam: true }, { memberId, allTeam: false }] };
}

/**
 * Comissão congelada no agendamento: o % atual da funcionária (nulo para a
 * dona). Gravar em Appointment.commissionPct ao criar ou trocar de profissional.
 */
export function commissionSnapshot(team: TeamPro[], memberId: string | null): number | null {
  if (!memberId) return null;
  return team.find((p) => p.memberId === memberId)?.commissionPct ?? null;
}

/** E-mail já usado por alguma conta (estúdio ou equipe)? Logins são únicos no app inteiro. */
export async function isEmailTaken(email: string, opts?: { exceptMemberId?: string }): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const [professional, member] = await Promise.all([
    prisma.professional.findUnique({ where: { email: normalized }, select: { id: true } }),
    prisma.teamMember.findUnique({ where: { email: normalized }, select: { id: true } }),
  ]);
  return Boolean(professional) || Boolean(member && member.id !== opts?.exceptMemberId);
}

/** Convite e redefinição de senha da equipe: token vai no link, só o hash fica no banco. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
