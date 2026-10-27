"use server";

/**
 * Equipe (só a dona): cadastro, convite, comissão e acesso das funcionárias.
 * Segurança: toda ação parte de requireOwner() e só mexe em TeamMember do
 * próprio estúdio (id do formulário sempre conferido com o professionalId).
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireProfessional } from "@/lib/session";
import { INVITE_TTL_MS, isEmailTaken, newToken } from "@/lib/team";
import { TEAM_COLORS, firstName } from "@/lib/team-shared";
import { getAppOrigin } from "@/lib/domain/queue";
import { emailLayout, getEmailProvider } from "@/lib/providers/email";
import type { InviteInfo } from "@/components/equipe/types";

export type MemberFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Convite recém-criado: o link só aparece nesta resposta. */
  invite?: InviteInfo;
  /** Aviso extra para a dona (ex.: ela voltou para o link). */
  notice?: string;
  savedAt?: number;
};

export type OwnerBookableState = { ok: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_USADO = "Este e-mail já tem uma conta no LashOS. Use outro e-mail para ela.";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function emailJaUsado(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type Dados = {
  name: string;
  email: string;
  color: string;
  commissionPct: number;
  bookableOnline: boolean;
};

/** Lê e valida o formulário. `corAtual` aceita a cor que ela já tem (mesmo fora da paleta). */
function lerFormulario(
  formData: FormData,
  corAtual?: string,
): { dados: Dados } | { fieldErrors: Record<string, string> } {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const color = String(formData.get("color") ?? "").toLowerCase().trim();
  const comissaoBruta = String(formData.get("commissionPct") ?? "").replace("%", "").trim();
  const commissionPct = comissaoBruta === "" ? Number.NaN : Number(comissaoBruta.replace(",", "."));
  const bookableOnline = String(formData.get("bookableOnline") ?? "") === "1";

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Escreva o nome dela.";
  else if (name.length > 80) fieldErrors.name = "Nome muito longo (até 80 caracteres).";
  if (!EMAIL_RE.test(email) || email.length > 120) fieldErrors.email = "Confira o e-mail: ele vira o login dela.";
  if (!TEAM_COLORS.includes(color) && color !== corAtual?.toLowerCase()) {
    fieldErrors.color = "Escolha uma das cores.";
  }
  if (!Number.isInteger(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    fieldErrors.commissionPct = "Use um número inteiro de 0 a 100.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { dados: { name, email, color, commissionPct, bookableOnline } };
}

/**
 * Monta o link do convite e tenta mandar por e-mail (melhor esforço).
 * Só diz que mandou quando o provedor é real e não deu erro.
 */
async function montarConvite(
  member: { name: string; email: string },
  token: string,
): Promise<InviteInfo> {
  const professional = await requireProfessional();
  const url = `${await getAppOrigin()}/convite/${token}`;
  const nome = firstName(member.name);
  const dona = firstName(professional.name);

  let emailSent = false;
  try {
    const provider = getEmailProvider();
    const resultado = await provider.send({
      to: member.email,
      subject: `Convite para a equipe do ${professional.studioName}`,
      html: emailLayout(
        `Oi, ${escapar(nome)}!`,
        `<p style="margin:0 0 16px;font-size:15px;color:#5e5b68;line-height:1.6;">
          <b style="color:#17151e;">${escapar(dona)}</b> te chamou para a equipe do
          <b style="color:#17151e;">${escapar(professional.studioName)}</b> no LashOS.
          Crie sua senha para entrar: o link vale por <b style="color:#17151e;">7 dias</b>.</p>
        <p style="margin:0 0 20px;">
          <a href="${url}" style="display:inline-block;background:#2a2240;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;">Criar minha senha</a>
        </p>
        <p style="margin:0;font-size:13px;color:#5e5b68;line-height:1.5;">
          Seu login será este e-mail (${escapar(member.email)}). Não esperava este convite? Pode ignorar.</p>`,
      ),
    });
    emailSent = resultado.ok && provider.name !== "console";
  } catch {
    emailSent = false;
  }

  return { url, firstName: nome, studioName: professional.studioName, emailSent };
}

/**
 * Sem ninguém da equipe atendendo pelo link, a dona volta a aparecer nele
 * (o link público nunca fica sem profissional).
 */
async function garantirAlguemNoLink(professionalId: string): Promise<string | undefined> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { ownerBookable: true },
  });
  if (!professional || professional.ownerBookable) return undefined;
  const noLink = await prisma.teamMember.count({
    where: { professionalId, active: true, bookableOnline: true },
  });
  if (noLink > 0) return undefined;
  await prisma.professional.update({ where: { id: professionalId }, data: { ownerBookable: true } });
  return "Como ninguém da equipe atende mais pelo link, você voltou a aparecer nele.";
}

function revalidar() {
  revalidatePath("/config/equipe");
  revalidatePath("/config");
}

/** Cria (sem id) ou edita (com id) uma profissional. Na criação, gera o convite. */
export async function salvarProfissionalAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const { professionalId } = await requireOwner();
  const id = String(formData.get("id") ?? "").trim();

  // ── Edição ──────────────────────────────────────────────
  if (id) {
    const atual = await prisma.teamMember.findFirst({
      where: { id, professionalId },
      select: { id: true, email: true, color: true },
    });
    if (!atual) return { ok: false, error: "Não encontramos esta profissional. Atualize a página." };

    const lido = lerFormulario(formData, atual.color);
    if ("fieldErrors" in lido) {
      return { ok: false, error: "Revise os campos destacados.", fieldErrors: lido.fieldErrors };
    }
    const { dados } = lido;
    if (dados.email !== atual.email && (await isEmailTaken(dados.email, { exceptMemberId: id }))) {
      return { ok: false, error: "Revise os campos destacados.", fieldErrors: { email: EMAIL_USADO } };
    }

    try {
      await prisma.teamMember.update({ where: { id: atual.id }, data: dados });
    } catch (error) {
      if (emailJaUsado(error)) {
        return { ok: false, error: "Revise os campos destacados.", fieldErrors: { email: EMAIL_USADO } };
      }
      throw error;
    }

    const notice = await garantirAlguemNoLink(professionalId);
    revalidar();
    return { ok: true, savedAt: Date.now(), notice };
  }

  // ── Nova profissional + convite ─────────────────────────
  const lido = lerFormulario(formData);
  if ("fieldErrors" in lido) {
    return { ok: false, error: "Revise os campos destacados.", fieldErrors: lido.fieldErrors };
  }
  const { dados } = lido;
  if (await isEmailTaken(dados.email)) {
    return { ok: false, error: "Revise os campos destacados.", fieldErrors: { email: EMAIL_USADO } };
  }

  const { token, hash } = newToken();
  let criada: { name: string; email: string };
  try {
    criada = await prisma.teamMember.create({
      data: {
        professionalId,
        ...dados,
        inviteTokenHash: hash,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { name: true, email: true },
    });
  } catch (error) {
    if (emailJaUsado(error)) {
      return { ok: false, error: "Revise os campos destacados.", fieldErrors: { email: EMAIL_USADO } };
    }
    throw error;
  }

  const invite = await montarConvite(criada, token);
  revalidar();
  return { ok: true, savedAt: Date.now(), invite };
}

/** Novo link de convite para quem ainda não criou a senha (o anterior deixa de valer). */
export async function gerarNovoConviteAction(memberId: string): Promise<MemberFormState> {
  const { professionalId } = await requireOwner();
  if (typeof memberId !== "string" || !memberId) {
    return { ok: false, error: "Não encontramos esta profissional. Atualize a página." };
  }

  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, professionalId },
    select: { id: true, name: true, email: true, active: true, passwordHash: true },
  });
  if (!member) return { ok: false, error: "Não encontramos esta profissional. Atualize a página." };
  if (member.passwordHash) {
    return {
      ok: false,
      error: "Ela já criou a senha. Se esqueceu, é só tocar em Esqueci minha senha na tela de login.",
    };
  }
  if (!member.active) return { ok: false, error: "Reative o acesso dela antes de gerar um convite." };

  const { token, hash } = newToken();
  await prisma.teamMember.update({
    where: { id: member.id },
    data: { inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });

  const invite = await montarConvite(member, token);
  revalidar();
  return { ok: true, savedAt: Date.now(), invite };
}

/**
 * Desativa (a sessão dela cai sozinha: requireViewer confere `active`) ou
 * reativa o acesso. Os atendimentos e números dela continuam no estúdio.
 */
export async function alterarAcessoAction(memberId: string, ativo: boolean): Promise<MemberFormState> {
  const { professionalId } = await requireOwner();
  if (typeof memberId !== "string" || !memberId) {
    return { ok: false, error: "Não encontramos esta profissional. Atualize a página." };
  }

  const resultado = await prisma.teamMember.updateMany({
    where: { id: memberId, professionalId },
    data: { active: ativo === true },
  });
  if (resultado.count === 0) {
    return { ok: false, error: "Não encontramos esta profissional. Atualize a página." };
  }

  const notice = ativo === true ? undefined : await garantirAlguemNoLink(professionalId);
  revalidar();
  return { ok: true, savedAt: Date.now(), notice };
}

/** A dona também atende pelo link? Só pode sair se alguém da equipe ficar nele. */
export async function salvarDonaAtendeAction(atende: boolean): Promise<OwnerBookableState> {
  const { professionalId } = await requireOwner();
  const ownerBookable = atende === true;

  if (!ownerBookable) {
    const noLink = await prisma.teamMember.count({
      where: { professionalId, active: true, bookableOnline: true },
    });
    if (noLink === 0) {
      return {
        ok: false,
        error: "Para sair do link, alguém da equipe precisa atender por ele.",
      };
    }
  }

  await prisma.professional.update({ where: { id: professionalId }, data: { ownerBookable } });
  revalidar();
  return { ok: true };
}
