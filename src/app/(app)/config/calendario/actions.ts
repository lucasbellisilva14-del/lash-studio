"use server";

/**
 * Link do calendário (.ics) de quem está logada: a dona assina a agenda do
 * estúdio inteiro; a funcionária, só os horários dela.
 */
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";

export type CalendarioState = { ok: boolean; error?: string; savedAt?: number };

async function salvarToken(calendarToken: string | null): Promise<void> {
  const viewer = await requireViewer();
  if (viewer.isOwner) {
    await prisma.professional.update({ where: { id: viewer.professionalId }, data: { calendarToken } });
  } else {
    await prisma.teamMember.update({
      where: { id: viewer.memberId!, professionalId: viewer.professionalId },
      data: { calendarToken },
    });
  }
}

/** Gera (ou regenera) o link — regenerar revoga o antigo. */
export async function gerarLinkCalendario(): Promise<CalendarioState> {
  try {
    await salvarToken(crypto.randomBytes(24).toString("base64url"));
    revalidatePath("/config/calendario");
    return { ok: true, savedAt: Date.now() };
  } catch {
    return { ok: false, error: "Não foi possível gerar o link. Tente novamente." };
  }
}

/** Desliga o link (o calendário para de receber os horários na hora). */
export async function desligarCalendario(): Promise<CalendarioState> {
  try {
    await salvarToken(null);
    revalidatePath("/config/calendario");
    return { ok: true, savedAt: Date.now() };
  } catch {
    return { ok: false, error: "Não foi possível desligar. Tente novamente." };
  }
}
