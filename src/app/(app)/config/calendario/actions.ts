"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";

export type CalendarioState = { ok: boolean; error?: string; savedAt?: number };

/** Gera (ou regenera) o token do feed — regenerar revoga o link antigo. */
export async function gerarLinkCalendario(): Promise<CalendarioState> {
  const professionalId = await requireProfessionalId();
  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { calendarToken: crypto.randomBytes(24).toString("base64url") },
    });
    revalidatePath("/config/calendario");
    return { ok: true, savedAt: Date.now() };
  } catch {
    return { ok: false, error: "Não foi possível gerar o link. Tente novamente." };
  }
}

/** Desliga o feed (apaga o token — o link para de funcionar na hora). */
export async function desligarCalendario(): Promise<CalendarioState> {
  const professionalId = await requireProfessionalId();
  try {
    await prisma.professional.update({
      where: { id: professionalId },
      data: { calendarToken: null },
    });
    revalidatePath("/config/calendario");
    return { ok: true, savedAt: Date.now() };
  } catch {
    return { ok: false, error: "Não foi possível desligar. Tente novamente." };
  }
}
