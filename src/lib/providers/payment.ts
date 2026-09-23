import "server-only";

/**
 * PaymentProvider: cobrança Pix do sinal com confirmação automática.
 * Ativo quando MP_ACCESS_TOKEN existe (Mercado Pago). Sem a env, o app
 * segue no fluxo manual (EMV estático + botão "Sinal recebido").
 */

export type PixCharge = {
  /** Id do pagamento no provedor (webhook usa pra casar). */
  paymentId: string;
  /** Código copia-e-cola do Pix. */
  pixCopiaECola: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPixCharge(params: {
    amountCents: number;
    description: string;
    /** Referência externa = appointmentId (volta no webhook). */
    externalReference: string;
    payerName: string;
    /** Expira junto com a janela de cancelamento (horas). */
    expiresInHours: number;
  }): Promise<PixCharge>;
  /** Consulta o status no provedor ("approved" confirma o sinal). */
  getPaymentStatus(paymentId: string): Promise<{
    status: string;
    externalReference: string | null;
  }>;
}

/**
 * Mercado Pago via Orders API (a nova — a Payments API clássica está em
 * descontinuação). Pedido "online" com pagamento Pix; a order paga fica
 * com status "processed".
 */
class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago";
  private readonly token = process.env.MP_ACCESS_TOKEN ?? "";

  async createPixCharge(params: {
    amountCents: number;
    description: string;
    externalReference: string;
    payerName: string;
    expiresInHours: number;
  }): Promise<PixCharge> {
    const valor = (params.amountCents / 100).toFixed(2);

    const res = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        // Idempotência: repetir a criação pro mesmo agendamento não duplica.
        "X-Idempotency-Key": `lashos-sinal-${params.externalReference}`,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: valor,
        external_reference: params.externalReference,
        description: params.description,
        transactions: {
          payments: [
            {
              amount: valor,
              payment_method: { id: "pix", type: "bank_transfer" },
              // Duração ISO 8601 — expira junto com a janela do sinal.
              expiration_time: `PT${params.expiresInHours}H`,
            },
          ],
        },
        payer: {
          // MP exige e-mail; o real da cliente não é coletado no agendamento.
          email: `sinal-${params.externalReference.toLowerCase()}@lashos.com.br`,
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      throw new Error(`Mercado Pago: cobrança falhou (${res.status} ${detail})`);
    }
    const data = (await res.json()) as {
      id: string;
      transactions?: {
        payments?: Array<{ payment_method?: { qr_code?: string } }>;
      };
    };
    const pix = data.transactions?.payments?.[0]?.payment_method?.qr_code;
    if (!pix) throw new Error("Mercado Pago: resposta sem código Pix");
    return { paymentId: data.id, pixCopiaECola: pix };
  }

  async getPaymentStatus(paymentId: string) {
    const res = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!res.ok) {
      throw new Error(`Mercado Pago: consulta falhou (${res.status})`);
    }
    const data = (await res.json()) as {
      status: string;
      external_reference?: string | null;
      transactions?: { payments?: Array<{ status?: string }> };
    };
    // Normaliza: order "processed" (ou pagamento interno idem) = sinal pago.
    const pago =
      data.status === "processed" ||
      data.transactions?.payments?.some(
        (p) => p.status === "processed" || p.status === "approved",
      );
    return {
      status: pago ? "approved" : data.status,
      externalReference: data.external_reference ?? null,
    };
  }
}

let provider: PaymentProvider | null = null;

/** null = integração desligada (sem MP_ACCESS_TOKEN). */
export function getPaymentProvider(): PaymentProvider | null {
  if (!process.env.MP_ACCESS_TOKEN) return null;
  if (!provider) provider = new MercadoPagoProvider();
  return provider;
}
