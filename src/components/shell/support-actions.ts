"use server";

/** "Falar com o suporte": guarda a mensagem (lida no /admin) e avisa por e-mail. */
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { emailLayout, getEmailProvider } from "@/lib/providers/email";

export type SupportState = { ok: boolean; error?: string; sentAt?: number };

const TIPOS = { DUVIDA: "Dúvida", PROBLEMA: "Problema", SUGESTAO: "Sugestão" } as const;
type Tipo = keyof typeof TIPOS;

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function enviarSuporteAction(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const professional = await requireProfessional();

  const tipo = String(formData.get("tipo") ?? "") as Tipo;
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const tela = String(formData.get("tela") ?? "").slice(0, 200) || null;

  if (!(tipo in TIPOS)) return { ok: false, error: "Escolha se é dúvida, problema ou sugestão." };
  if (mensagem.length < 5) return { ok: false, error: "Conte um pouco mais para a gente entender." };
  if (mensagem.length > 2000) return { ok: false, error: "A mensagem ficou longa demais (até 2.000 caracteres)." };

  await prisma.supportMessage.create({
    data: { professionalId: professional.id, kind: tipo, message: mensagem, pagePath: tela },
  });

  // E-mail é cortesia: a mensagem já está salva no painel admin.
  const destino = (process.env.ADMIN_EMAILS ?? "lucasbellisilva14@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  if (destino) {
    try {
      await getEmailProvider().send({
        to: destino,
        subject: `[LashOS] ${TIPOS[tipo]} — ${professional.studioName}`,
        html: emailLayout(
          `${TIPOS[tipo]} de ${escapar(professional.studioName)}`,
          `<p style="margin:0 0 12px"><strong>${escapar(professional.name)}</strong> · ${escapar(professional.email)}${professional.whatsapp ? ` · ${escapar(professional.whatsapp)}` : ""}</p>
           <p style="margin:0 0 12px;color:#5e5b68">Tela: ${escapar(tela ?? "—")}</p>
           <p style="margin:0;white-space:pre-wrap">${escapar(mensagem)}</p>`,
        ),
      });
    } catch {
      // sem e-mail configurado: fica só no /admin
    }
  }

  return { ok: true, sentAt: Date.now() };
}
