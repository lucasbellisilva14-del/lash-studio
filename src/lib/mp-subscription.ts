import "server-only";

/**
 * Assinatura recorrente do LashOS via Mercado Pago (preapproval).
 * Cobra no cartão, todo mês, na conta do APP (MP_ACCESS_TOKEN global) —
 * é a receita do LashOS, diferente do sinal (que vai pra profissional).
 */
import { prisma } from "@/lib/prisma";

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("MP_ACCESS_TOKEN ausente — assinaturas indisponíveis");
  return t;
}

export function assinaturasDisponiveis(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/** Cria a assinatura pendente e devolve o checkout do MP (cadastro do cartão). */
export async function criarAssinatura(params: {
  professionalId: string;
  email: string;
  studioName: string;
  amountCents: number;
  backUrl: string;
}): Promise<{ preapprovalId: string; initPoint: string }> {
  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: `LashOS — assinatura mensal (${params.studioName})`,
      external_reference: params.professionalId,
      payer_email: params.email,
      back_url: params.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number((params.amountCents / 100).toFixed(2)),
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });
  if (!res.ok) {
    throw new Error(`MP assinatura falhou (${res.status} ${(await res.text()).slice(0, 300)})`);
  }
  const data = (await res.json()) as { id: string; init_point: string };
  if (!data.init_point) throw new Error("MP assinatura: resposta sem init_point");

  await prisma.professional.update({
    where: { id: params.professionalId },
    data: { mpPreapprovalId: data.id },
  });
  return { preapprovalId: data.id, initPoint: data.init_point };
}

type Preapproval = {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string | null;
  next_payment_date?: string | null;
};

async function getPreapproval(id: string): Promise<Preapproval | null> {
  const res = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`MP preapproval GET falhou (${res.status})`);
  return (await res.json()) as Preapproval;
}

/** Evento de cobrança recorrente → descobre a assinatura correspondente. */
async function preapprovalIdDoPagamento(authorizedPaymentId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.mercadopago.com/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`,
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { preapproval_id?: string };
  return data.preapproval_id ?? null;
}

/**
 * Ressincroniza a assinatura a partir do MP (chamada pelo webhook):
 * authorized → ATIVA com validade = próxima cobrança; cancelada/pausada
 * fica ATIVA até a validade acabar (a graça do gate cuida do resto).
 */
export async function sincronizarAssinatura(idRecebido: string, topico: string): Promise<boolean> {
  let preapprovalId = idRecebido;
  if (topico.includes("authorized_payment")) {
    const resolvido = await preapprovalIdDoPagamento(idRecebido);
    if (!resolvido) return false;
    preapprovalId = resolvido;
  }

  const pre = await getPreapproval(preapprovalId);
  if (!pre) return false;

  const professional = await prisma.professional.findFirst({
    where: {
      OR: [{ mpPreapprovalId: pre.id }, { id: pre.external_reference ?? "" }],
    },
    select: { id: true },
  });
  if (!professional) return false;

  if (pre.status === "authorized") {
    // Validade = próxima cobrança (ou +32 dias como rede de segurança)
    const paidUntil = pre.next_payment_date
      ? new Date(pre.next_payment_date)
      : new Date(Date.now() + 32 * 24 * 3600_000);
    await prisma.professional.update({
      where: { id: professional.id },
      data: {
        subscriptionStatus: "ATIVA",
        subscriptionPaidUntil: paidUntil,
        mpPreapprovalId: pre.id,
      },
    });
  }
  // paused/cancelled: não mexe — o acesso expira sozinho na validade + graça.
  return true;
}
