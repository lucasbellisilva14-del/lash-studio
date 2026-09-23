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
    const expiration = new Date(Date.now() + params.expiresInHours * 3600_000)
      .toISOString()
      .replace("Z", "-00:00");
    const [firstName, ...rest] = params.payerName.trim().split(/\s+/);

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        // Idempotência: repetir a criação pro mesmo agendamento não duplica.
        "X-Idempotency-Key": `lashos-sinal-${params.externalReference}`,
      },
      body: JSON.stringify({
        transaction_amount: Number((params.amountCents / 100).toFixed(2)),
        description: params.description,
        payment_method_id: "pix",
        external_reference: params.externalReference,
        date_of_expiration: expiration,
        payer: {
          // MP exige e-mail; o real da cliente não é coletado no agendamento.
          email: `sinal-${params.externalReference}@lashos.com.br`,
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      throw new Error(`Mercado Pago: cobrança falhou (${res.status} ${detail})`);
    }
    const data = (await res.json()) as {
      id: number;
      point_of_interaction?: { transaction_data?: { qr_code?: string } };
    };
    const pix = data.point_of_interaction?.transaction_data?.qr_code;
    if (!pix) throw new Error("Mercado Pago: resposta sem código Pix");
    return { paymentId: String(data.id), pixCopiaECola: pix };
  }

  async getPaymentStatus(paymentId: string) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      throw new Error(`Mercado Pago: consulta falhou (${res.status})`);
    }
    const data = (await res.json()) as {
      status: string;
      external_reference?: string | null;
    };
    return { status: data.status, externalReference: data.external_reference ?? null };
  }
}

let provider: PaymentProvider | null = null;

/** null = integração desligada (sem MP_ACCESS_TOKEN). */
export function getPaymentProvider(): PaymentProvider | null {
  if (!process.env.MP_ACCESS_TOKEN) return null;
  if (!provider) provider = new MercadoPagoProvider();
  return provider;
}
