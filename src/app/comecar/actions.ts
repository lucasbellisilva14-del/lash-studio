"use server";

/**
 * Cadastro pela própria cliente (/comecar): cria o estúdio em teste grátis,
 * entra e manda para o checkout do Mercado Pago salvar o cartão. A primeira
 * cobrança só acontece quando o teste termina. Sem MP configurado (dev), entra direto.
 */
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailTaken } from "@/lib/team";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { criarEstudio } from "@/lib/domain/accounts";
import { TRIAL_DIAS, isPlanKey, normalizeSellerCode } from "@/lib/domain/plans";
import { getAppOrigin } from "@/lib/domain/queue";
import { assinaturasDisponiveis, criarAssinatura } from "@/lib/mp-subscription";
import { emailLayout, getEmailProvider } from "@/lib/providers/email";

export type ComecarState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function comecarAction(_prev: ComecarState, formData: FormData): Promise<ComecarState> {
  // Campo escondido que só robô preenche.
  if (texto(formData, "site")) return { error: "Não foi possível criar a conta." };

  const name = texto(formData, "name").replace(/\s+/g, " ");
  const studioName = texto(formData, "studioName").replace(/\s+/g, " ");
  const whatsappBruto = texto(formData, "whatsapp");
  const email = texto(formData, "email").toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const planoBruto = texto(formData, "plano");
  const sellerCode = normalizeSellerCode(texto(formData, "codigo"));
  const termos = texto(formData, "termos") === "1";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Como você se chama?";
  if (studioName.length < 2) fieldErrors.studioName = "Dê um nome ao seu estúdio (pode ser o seu).";
  if (!isValidPhone(whatsappBruto)) fieldErrors.whatsapp = "Confira o WhatsApp, com DDD.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Confira o e-mail.";
  if (senha.length < 8) fieldErrors.senha = "Pelo menos 8 caracteres.";
  if (!isPlanKey(planoBruto)) fieldErrors.plano = "Escolha um plano.";
  if (texto(formData, "codigo") && !sellerCode) fieldErrors.codigo = "Código inválido (só letras e números).";
  if (!termos) fieldErrors.termos = "Para criar a conta, aceite os termos.";
  if (Object.keys(fieldErrors).length > 0) return { error: "Revise os campos destacados.", fieldErrors };
  const plan = planoBruto as "SOLO" | "EMPRESA";

  if (await isEmailTaken(email)) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: { email: "Já existe uma conta com este e-mail. Entre com ela ou use outro." },
    };
  }

  const conta = await criarEstudio({
    name,
    studioName,
    email,
    senha,
    whatsapp: normalizePhone(whatsappBruto),
    plan,
    trialDias: TRIAL_DIAS,
    signupSource: "SITE",
    sellerCode,
    termsAcceptedAt: new Date(),
  });

  // Boas-vindas (melhor esforço).
  const origem = await getAppOrigin();
  getEmailProvider()
    .send({
      to: email,
      subject: "Seu LashOS está pronto",
      html: emailLayout(
        `Oi, ${escapar(name.split(" ")[0])}!`,
        `<p style="margin:0 0 16px;font-size:15px;color:#17151e;line-height:1.6;">
          Seu estúdio <b>${escapar(studioName)}</b> já está no LashOS, com ${TRIAL_DIAS} dias grátis.
          Seu link de agendamento: <a href="${origem}/agendar/${conta.slug}" style="color:#2a2240;">${origem}/agendar/${conta.slug}</a></p>
        <p style="margin:0 0 20px;"><a href="${origem}/login" style="display:inline-block;background:#2a2240;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">Abrir o LashOS</a></p>
        <p style="margin:0;font-size:13px;color:#5e5b68;line-height:1.5;">Dúvidas? Responda este e-mail ou use "Falar com o suporte" dentro do app.</p>`,
      ),
    })
    .catch(() => {});

  // Entra sem redirecionar aqui: o destino depende do Mercado Pago.
  try {
    await signIn("credentials", { email, password: senha, redirect: false });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (!(error instanceof AuthError)) throw error;
    redirect("/login?conta=criada");
  }

  // Cartão agora, cobrança só no fim do teste. Se o MP falhar, a tela de assinatura pede de novo.
  if (assinaturasDisponiveis()) {
    const p = await prisma.professional.findUniqueOrThrow({
      where: { id: conta.id },
      select: { id: true, email: true, studioName: true, planPriceCents: true, trialEndsAt: true },
    });
    try {
      const r = await criarAssinatura({
        professionalId: p.id,
        email: p.email,
        studioName: p.studioName,
        amountCents: p.planPriceCents,
        backUrl: `${origem}/assinatura?volta=1`,
        startDate: p.trialEndsAt,
      });
      redirect(r.initPoint);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error("[comecar] assinatura não iniciou:", error);
      redirect("/assinatura?cartao=1");
    }
  }
  redirect("/");
}
