"use server";

import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/team";
import { firstName } from "@/lib/team-shared";
import { getAppOrigin } from "@/lib/domain/queue";
import { emailLayout, getEmailProvider } from "@/lib/providers/email";

export type RecuperarState = { ok?: boolean; error?: string };

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const REENVIO_MS = 2 * 60 * 1000; // anti-spam: um pedido a cada 2 min

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Token pedido há menos de 2 min? (a validade é sempre agora + 1h) */
function pediuAgora(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() - Date.now() > TOKEN_TTL_MS - REENVIO_MS);
}

async function enviarLink(opts: {
  to: string;
  nome: string;
  contexto: string;
  token: string;
}): Promise<void> {
  const link = `${await getAppOrigin()}/login/redefinir/${opts.token}`;
  await getEmailProvider().send({
    to: opts.to,
    subject: "Redefinir sua senha do LashOS",
    html: emailLayout(
      `Oi, ${escapar(firstName(opts.nome))}!`,
      `<p style="margin:0 0 16px;font-size:15px;color:#5e5b68;line-height:1.6;">
        Recebemos um pedido para redefinir ${opts.contexto}.
        Toque no botão abaixo: o link vale por <b style="color:#17151e;">1 hora</b>.</p>
      <p style="margin:0 0 20px;">
        <a href="${link}" style="display:inline-block;background:#2a2240;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">Criar nova senha</a>
      </p>
      <p style="margin:0;font-size:13px;color:#5e5b68;line-height:1.5;">
        Não foi você? Pode ignorar este e-mail: sua senha continua a mesma.</p>`,
    ),
  });
}

/**
 * Solicita a redefinição de senha. Resposta é sempre neutra — não revela
 * se o e-mail existe. Reenvio só após 2 min do último pedido.
 * Vale para a dona do estúdio e para a equipe (funcionária ativa com senha).
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
    if (!pediuAgora(professional.resetTokenExpiresAt)) {
      const { token, hash } = newToken();
      await prisma.professional.update({
        where: { id: professional.id },
        data: {
          resetTokenHash: hash,
          resetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });
      await enviarLink({
        to: email,
        nome: professional.name,
        contexto: `a senha do <b style="color:#17151e;">${escapar(professional.studioName)}</b>`,
        token,
      });
    }
    return { ok: true };
  }

  // Equipe: só quem já criou a senha (convite pendente usa o link do convite).
  const member = await prisma.teamMember.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      active: true,
      passwordHash: true,
      resetTokenExpiresAt: true,
      professional: { select: { studioName: true } },
    },
  });

  if (member?.active && member.passwordHash && !pediuAgora(member.resetTokenExpiresAt)) {
    const { token, hash } = newToken();
    await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        resetTokenHash: hash,
        resetTokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    await enviarLink({
      to: email,
      nome: member.name,
      contexto: `a sua senha da equipe do <b style="color:#17151e;">${escapar(member.professional.studioName)}</b>`,
      token,
    });
  }

  return { ok: true };
}
