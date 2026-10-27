"use server";

/**
 * "Falar com o suporte": guarda a mensagem (lida no /admin) e avisa por e-mail.
 * Registra quem enviou: a dona ou alguém da equipe (sem mudar o schema, o
 * remetente vai na primeira linha da mensagem).
 */
import { requireProfessional, requireViewer } from "@/lib/session";
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
  const viewer = await requireViewer();
  const professional = await requireProfessional();

  const tipo = String(formData.get("tipo") ?? "") as Tipo;
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const tela = String(formData.get("tela") ?? "").slice(0, 200) || null;

  if (!(tipo in TIPOS)) return { ok: false, error: "Escolha se é dúvida, problema ou sugestão." };
  if (mensagem.length < 5) return { ok: false, error: "Conte um pouco mais para a gente entender." };
  if (mensagem.length > 2000) return { ok: false, error: "A mensagem ficou longa demais (até 2.000 caracteres)." };

  // Quem enviou: a dona (contatos do estúdio) ou a funcionária (e-mail dela, para a resposta).
  const nome = viewer.isOwner ? professional.name : viewer.name;
  let emailRemetente = professional.email;
  if (!viewer.isOwner) {
    const member = await prisma.teamMember.findFirst({
      where: { id: viewer.memberId ?? "", professionalId: professional.id },
      select: { email: true },
    });
    emailRemetente = member?.email ?? "";
  }
  const remetente = viewer.isOwner ? nome : `${nome} (equipe)`;
  const registro = viewer.isOwner
    ? `Enviada por ${remetente}`
    : `Enviada por ${remetente}${emailRemetente ? ` · ${emailRemetente}` : ""}`;

  await prisma.supportMessage.create({
    data: {
      professionalId: professional.id,
      kind: tipo,
      message: `${registro}\n\n${mensagem}`,
      pagePath: tela,
    },
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
        subject: `[LashOS] ${TIPOS[tipo]} — ${professional.studioName}${viewer.isOwner ? "" : " (equipe)"}`,
        html: emailLayout(
          `${TIPOS[tipo]} de ${escapar(professional.studioName)}`,
          `<p style="margin:0 0 12px"><strong>${escapar(remetente)}</strong>${emailRemetente ? ` · ${escapar(emailRemetente)}` : ""}${viewer.isOwner && professional.whatsapp ? ` · ${escapar(professional.whatsapp)}` : ""}</p>
           ${viewer.isOwner ? "" : `<p style="margin:0 0 12px;color:#5e5b68">Estúdio: ${escapar(professional.name)} · ${escapar(professional.email)}${professional.whatsapp ? ` · ${escapar(professional.whatsapp)}` : ""}</p>`}
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
