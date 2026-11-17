import "server-only";

/**
 * Indique e ganhe: cada estúdio tem um código próprio. A amiga que se cadastra
 * com ele fica ligada à indicadora (Professional.referredById) e, quando a
 * PRIMEIRA mensalidade dela é paga, a indicadora ganha 1 mês grátis
 * (ReferralCredit PENDENTE, um por indicada). Quem aplica o mês é o admin.
 */
import { prisma } from "@/lib/prisma";
import { sendPushToProfessional } from "@/components/push/send";

const GENERICAS = ["STUDIO", "ESTUDIO", "LASH", "LASHES", "CILIOS", "DESIGNER"];

/** Base do código: a primeira palavra própria do nome do estúdio, até 8 letras. */
function baseDoCodigo(studioName: string): string {
  const limpo = studioName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
  const palavra = limpo.split(/\s+/).find((p) => p.length >= 3 && !GENERICAS.includes(p));
  return (palavra ?? limpo.replace(/\s+/g, "")).slice(0, 8) || "LASH";
}

/** Devolve o código de indicação do estúdio, criando na primeira vez. */
export async function garantirCodigoIndicacao(professionalId: string): Promise<string> {
  const p = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { referralCode: true, studioName: true },
  });
  if (p.referralCode) return p.referralCode;

  const base = baseDoCodigo(p.studioName);
  for (let i = 0; i < 12; i++) {
    const codigo = `${base}${Math.floor(100 + Math.random() * 900)}`;
    try {
      // Só grava se ainda estiver vazio (duas abas ao mesmo tempo não trocam o código).
      const r = await prisma.professional.updateMany({
        where: { id: professionalId, referralCode: null },
        data: { referralCode: codigo },
      });
      if (r.count === 1) return codigo;
      const atual = await prisma.professional.findUniqueOrThrow({
        where: { id: professionalId },
        select: { referralCode: true },
      });
      if (atual.referralCode) return atual.referralCode;
    } catch {
      // código já usado por outro estúdio: sorteia de novo
    }
  }
  throw new Error("Não foi possível gerar o código de indicação");
}

/** Estúdio dono do código (já normalizado), ou null se for código de vendedora. */
export async function acharIndicadora(
  codigo: string | null,
): Promise<{ id: string; studioName: string } | null> {
  if (!codigo) return null;
  return prisma.professional.findUnique({
    where: { referralCode: codigo },
    select: { id: true, studioName: true },
  });
}

/**
 * Chamado quando uma mensalidade é paga. Se a conta foi indicada e ainda não
 * gerou crédito, a indicadora ganha 1 mês (valor da mensalidade DELA).
 * O índice único em referredId garante um crédito só por indicada.
 */
export async function creditarIndicacao(referredId: string): Promise<boolean> {
  const indicada = await prisma.professional.findUnique({
    where: { id: referredId },
    select: {
      studioName: true,
      referredBy: { select: { id: true, planPriceCents: true } },
    },
  });
  if (!indicada?.referredBy || indicada.referredBy.id === referredId) return false;

  try {
    await prisma.referralCredit.create({
      data: {
        referrerId: indicada.referredBy.id,
        referredId,
        valueCents: indicada.referredBy.planPriceCents,
      },
    });
  } catch {
    return false; // já creditado
  }

  await sendPushToProfessional(indicada.referredBy.id, {
    title: "Você ganhou 1 mês grátis!",
    body: `${indicada.studioName} assinou o LashOS pela sua indicação.`,
    url: "/indicar",
  }).catch(() => {});
  return true;
}
