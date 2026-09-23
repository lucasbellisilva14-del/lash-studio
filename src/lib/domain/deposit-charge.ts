import "server-only";

/**
 * Cobrança automática do sinal (Mercado Pago) + confirmação idempotente.
 * Sem MP_ACCESS_TOKEN nada disso roda — o fluxo manual continua intacto.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/providers/payment";

/**
 * Cria a cobrança Pix do sinal pro agendamento (melhor esforço).
 * Falha silenciosa: sem MP ou com erro, o EMV estático continua valendo.
 */
export async function criarCobrancaSinal(appointmentId: string): Promise<void> {
  const provider = getPaymentProvider();
  if (!provider) return;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
        professional: { select: { studioName: true, cancellationWindowHours: true } },
      },
    });
    if (
      !appt ||
      appt.status !== "PRE_AGENDADO" ||
      !appt.depositCents ||
      appt.depositCents <= 0 ||
      appt.mpPaymentId
    ) {
      return;
    }

    const charge = await provider.createPixCharge({
      amountCents: appt.depositCents,
      description: `Sinal — ${appt.service.name} · ${appt.professional.studioName}`,
      externalReference: appt.id,
      payerName: appt.client.name,
      // Vale até 48h (ou a janela de cancelamento, o que for maior)
      expiresInHours: Math.max(48, appt.professional.cancellationWindowHours),
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { mpPaymentId: charge.paymentId, pixCopiaCola: charge.pixCopiaECola },
    });
  } catch (e) {
    console.error("[mp] cobrança de sinal falhou (fluxo manual segue):", e);
  }
}

/**
 * Confirma o sinal pago (webhook): idempotente e espelhando a ação manual —
 * status CONFIRMADO + depositPaidAt + lançamento SINAL no financeiro.
 */
export async function confirmarSinalPago(appointmentId: string): Promise<boolean> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { name: true } },
    },
  });
  if (!appt) return false;
  if (appt.depositPaidAt) return true; // já confirmado — idempotente

  const agora = new Date();
  const escritas: Prisma.PrismaPromise<unknown>[] = [
    prisma.appointment.update({
      where: { id: appt.id },
      data: {
        depositPaidAt: agora,
        ...(appt.status === "PRE_AGENDADO" ? { status: "CONFIRMADO" } : {}),
      },
    }),
  ];

  if (appt.depositCents && appt.depositCents > 0) {
    const jaLancado = await prisma.transaction.findFirst({
      where: { professionalId: appt.professionalId, appointmentId: appt.id, kind: "SINAL" },
    });
    if (!jaLancado) {
      escritas.push(
        prisma.transaction.create({
          data: {
            professionalId: appt.professionalId,
            type: "RECEITA",
            kind: "SINAL",
            appointmentId: appt.id,
            clientId: appt.client.id,
            description: `Sinal — ${appt.service.name} (${appt.client.name})`,
            amountCents: appt.depositCents,
            method: "PIX",
            feePct: 0,
            feeCents: 0,
            netCents: appt.depositCents,
            date: agora,
          },
        }),
      );
    }
  }

  await prisma.$transaction(escritas);
  return true;
}
