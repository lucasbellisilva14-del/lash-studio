/**
 * Webhook do Mercado Pago: pagamento Pix do sinal aprovado → confirma o
 * agendamento sozinho (sem tocar em "Sinal recebido").
 *
 * Autenticidade: nunca confiamos no corpo — pegamos só o id e CONSULTAMOS
 * o pagamento na API do MP com o nosso token. O que a API disser, vale.
 */
import { getPaymentProvider } from "@/lib/providers/payment";
import { confirmarSinalPago } from "@/lib/domain/deposit-charge";
import { prisma } from "@/lib/prisma";
import { sendPushToProfessional } from "@/components/push/send";
import { formatBRL } from "@/lib/money";

export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) return Response.json({ ok: true, ignorado: "sem integração" });

  // MP manda o id no corpo ({data:{id}}) ou na query (?data.id=...)
  let paymentId: string | null = null;
  try {
    const body = (await request.json()) as { type?: string; data?: { id?: unknown } };
    if (body?.data?.id != null) paymentId = String(body.data.id);
  } catch {
    // corpo vazio/não-JSON — tenta a query
  }
  if (!paymentId) {
    paymentId = new URL(request.url).searchParams.get("data.id");
  }
  if (!paymentId) return Response.json({ ok: true, ignorado: "sem id" });

  try {
    const pagamento = await provider.getPaymentStatus(paymentId);
    if (pagamento.status !== "approved" || !pagamento.externalReference) {
      return Response.json({ ok: true, status: pagamento.status });
    }

    const confirmado = await confirmarSinalPago(pagamento.externalReference);
    if (confirmado) {
      // Avisa a profissional na hora: sinal caiu 🎉
      const appt = await prisma.appointment.findUnique({
        where: { id: pagamento.externalReference },
        include: { client: { select: { name: true } } },
      });
      if (appt) {
        await sendPushToProfessional(appt.professionalId, {
          title: "Sinal recebido! 💸",
          body: `${appt.client.name} pagou ${formatBRL(appt.depositCents ?? 0)} — horário confirmado sozinho.`,
          url: "/agenda",
        }).catch(() => {});
      }
    }
    return Response.json({ ok: true, confirmado });
  } catch (e) {
    console.error("[mp] webhook falhou:", e);
    // 500 → MP reagenda a entrega (retry automático)
    return Response.json({ ok: false }, { status: 500 });
  }
}
