import "server-only";

/**
 * EmailProvider: envio transacional atrás desta interface.
 * Produção: Resend (REST). Sem RESEND_API_KEY, cai no console (dev).
 *
 * Obs.: com o remetente sandbox (onboarding@resend.dev) o Resend só entrega
 * para o e-mail do dono da conta — verificar um domínio libera qualquer
 * destinatária (resend.com/domains) e aí o EMAIL_FROM muda pro domínio.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ ok: boolean; error?: string }>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  async send(message: EmailMessage) {
    console.log(`[email] para=${message.to} assunto=${message.subject}`);
    return { ok: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  async send(message: EmailMessage) {
    const from = process.env.EMAIL_FROM ?? "LashOS <onboarding@resend.dev>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[email] resend falhou (${res.status}): ${body.slice(0, 300)}`);
        return { ok: false, error: `resend ${res.status}` };
      }
      return { ok: true };
    } catch (e) {
      console.error("[email] resend indisponível:", e);
      return { ok: false, error: "indisponível" };
    }
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider = process.env.RESEND_API_KEY
      ? new ResendEmailProvider()
      : new ConsoleEmailProvider();
  }
  return provider;
}

/** Casca padrão dos e-mails do LashOS (inline CSS — clientes de e-mail). */
export function emailLayout(titulo: string, corpoHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#faf5f0;font-family:'Segoe UI',system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5f0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee2d6;">
        <tr><td style="background:#D6336C;padding:20px 28px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">LashOS 💗</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:19px;color:#2b2118;">${titulo}</h1>
          ${corpoHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #f2e8dc;">
          <p style="margin:0;font-size:12px;color:#9a8a74;">Seu estúdio inteiro, no seu celular.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
