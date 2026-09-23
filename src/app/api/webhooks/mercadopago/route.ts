/**
 * Webhook do Mercado Pago: pagamento Pix do sinal aprovado → confirma o
 * agendamento sozinho (sem tocar em "Sinal recebido").
 *
 * Autenticidade: nunca confiamos no corpo — pegamos só o id e CONSULTAMOS
 * o pagamento na API do MP com o nosso token. O que a API disser, vale.
 */
import crypto from "node:crypto";
import { getPaymentProvider } from "@/lib/providers/payment";
import { confirmarSinalPago } from "@/lib/domain/deposit-charge";
import { prisma } from "@/lib/prisma";
import { sendPushToProfessional } from "@/components/push/send";
import { formatBRL } from "@/lib/money";

/**
 * Valida a assinatura oficial do MP (x-signature: ts=...,v1=...):
 * HMAC-SHA256 do manifesto "id:{data.id};request-id:{x-request-id};ts:{ts};"
 * com a MP_WEBHOOK_SECRET. Sem a env, pula (a consulta à API já protege).
 */
function assinaturaValida(request: Request, dataId: string | null): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const partes = new Map(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()] as const;
    }),
  );
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  if (!ts || !v1) return false;

  const manifesto = `id:${(dataId ?? "").toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifesto).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch {
    return false;
  }
}

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

  if (!assinaturaValida(request, paymentId)) {
    return Response.json({ error: "assinatura inválida" }, { status: 401 });
  }

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
