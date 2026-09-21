"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { emailLayout, getEmailProvider } from "@/lib/providers/email";

export type RecuperarState = { ok?: boolean; error?: string };

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Solicita a redefinição de senha. Resposta é sempre neutra — não revela
 * se o e-mail existe. Reenvio só após 2 min do último pedido.
 */
export async function solicitarRecuperacao(
  _prev: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) {
    return { error: "Informe o e-mail da sua conta." };
  }

  const professional = await prisma.professional.findUnique({ where: { email } });

  if (professional) {
    // Anti-spam: se acabou de pedir (token emitido há <2min), não reenvia.
    const issuedRecently =
      professional.resetTokenExpiresAt &&
      professional.resetTokenExpiresAt.getTime() - Date.now() > TOKEN_TTL_MS - 2 * 60 * 1000;

    if (!issuedRecently) {
      const token = crypto.randomBytes(32).toString("base64url");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await prisma.professional.update({
        where: { id: professional.id },
        data: {
          resetTokenHash: hash,
          resetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
      const proto = h.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${host}/login/redefinir/${token}`;

      await getEmailProvider().send({
        to: email,
        subject: "Redefinir sua senha do LashOS",
        html: emailLayout(
          `Oi, ${professional.name.split(" ")[0]}!`,
          `<p style="margin:0 0 16px;font-size:15px;color:#4a3c2e;line-height:1.6;">
            Recebemos um pedido para redefinir a senha do <b>${professional.studioName}</b>.
            Toque no botão abaixo — o link vale por <b>1 hora</b>.</p>
          <p style="margin:0 0 20px;">
            <a href="${link}" style="display:inline-block;background:#D6336C;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px;">Criar nova senha</a>
          </p>
          <p style="margin:0;font-size:13px;color:#9a8a74;line-height:1.5;">
            Não foi você? Pode ignorar este e-mail — sua senha continua a mesma.</p>`,
        ),
      });
    }
  }

  return { ok: true };
}
