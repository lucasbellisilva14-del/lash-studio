/** Consultas de ciclo compartilhadas entre módulos (agenda, clientes, home). */
import { prisma } from "@/lib/prisma";
import { LASH_CYCLE_CATEGORIES } from "@/lib/constants";
import { computeClientCycle, type ClientCycleInfo } from "@/lib/domain/client-status";

/** Último atendimento de cílios CONCLUÍDO da cliente (aplicação ou manutenção). */
export async function getLastLashAppointment(clientId: string) {
  return prisma.appointment.findFirst({
    where: {
      clientId,
      status: "CONCLUIDO",
      service: { category: { in: [...LASH_CYCLE_CATEGORIES] } },
    },
    orderBy: { startAt: "desc" },
    include: { service: true },
  });
}

export async function getClientCycle(
  clientId: string,
  settings: { maintenanceLimitDays: number; inactiveDays: number; timezone?: string },
  now = new Date(),
): Promise<ClientCycleInfo> {
  const lastLash = await getLastLashAppointment(clientId);
  return computeClientCycle(lastLash?.startAt ?? null, settings, now);
}
