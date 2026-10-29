import "server-only";

/**
 * Criação de estúdio (conta nova), usada pelo painel admin e pelo cadastro
 * público em /comecar. Clona horários, taxas, modelos de mensagem e serviços
 * da conta mais antiga (a piloto), para a nova já nascer pronta para usar.
 */
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/domain/plans";

/** Slug único a partir do nome do estúdio. */
export async function gerarSlug(studioName: string): Promise<string> {
  const base =
    studioName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "estudio";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const existe = await prisma.professional.findUnique({ where: { slug } });
    if (!existe) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export type NovoEstudio = {
  name: string;
  studioName: string;
  email: string;
  senha: string;
  whatsapp?: string | null;
  plan: PlanKey;
  /** Preço calibrado; sem ele, o do plano. */
  planPriceCents?: number;
  /** 0 = sem teste: já nasce ATIVA por 30 dias (uso do admin). */
  trialDias: number;
  signupSource: "ADMIN" | "SITE";
  sellerCode?: string | null;
  termsAcceptedAt?: Date | null;
};

export async function criarEstudio(dados: NovoEstudio): Promise<{ id: string; slug: string }> {
  const modelo = await prisma.professional.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      workingHours: true,
      paymentFees: true,
      messageTemplates: true,
      services: { where: { active: true } },
    },
  });

  const emTrial = dados.trialDias > 0;
  const nova = await prisma.professional.create({
    data: {
      email: dados.email,
      passwordHash: bcrypt.hashSync(dados.senha, 10),
      name: dados.name,
      studioName: dados.studioName,
      slug: await gerarSlug(dados.studioName),
      whatsapp: dados.whatsapp ?? null,
      plan: dados.plan,
      planPriceCents: dados.planPriceCents ?? PLANS[dados.plan].priceCents,
      subscriptionStatus: emTrial ? "TRIAL" : "ATIVA",
      trialEndsAt: emTrial ? addDays(new Date(), dados.trialDias) : null,
      subscriptionPaidUntil: emTrial ? null : addDays(new Date(), 30),
      signupSource: dados.signupSource,
      sellerCode: dados.sellerCode ?? null,
      termsAcceptedAt: dados.termsAcceptedAt ?? null,
      onboardingDone: false,
      workingHours: modelo
        ? {
            create: modelo.workingHours.map((h) => ({
              weekday: h.weekday,
              startTime: h.startTime,
              endTime: h.endTime,
              active: h.active,
            })),
          }
        : undefined,
      paymentFees: modelo
        ? { create: modelo.paymentFees.map((f) => ({ method: f.method, feePct: f.feePct })) }
        : undefined,
      messageTemplates: modelo
        ? {
            create: modelo.messageTemplates.map((t) => ({
              kind: t.kind,
              name: t.name,
              body: t.body,
              active: t.active,
            })),
          }
        : undefined,
    },
    select: { id: true, slug: true },
  });

  // Serviços do modelo com vínculo aplicação ↔ manutenção preservado
  if (modelo) {
    const mapa = new Map<string, string>();
    for (const s of modelo.services.filter((s) => !s.maintenanceOfId)) {
      const criado = await prisma.service.create({
        data: {
          professionalId: nova.id,
          name: s.name,
          category: s.category,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          requiresDeposit: s.requiresDeposit,
          returnDays: s.returnDays,
        },
      });
      mapa.set(s.id, criado.id);
    }
    for (const s of modelo.services.filter((s) => s.maintenanceOfId)) {
      await prisma.service.create({
        data: {
          professionalId: nova.id,
          name: s.name,
          category: s.category,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          requiresDeposit: s.requiresDeposit,
          returnDays: s.returnDays,
          maintenanceOfId: mapa.get(s.maintenanceOfId!) ?? null,
        },
      });
    }
  }

  return nova;
}

/**
 * Primeira funcionária cadastrada: o plano SOLO vira EMPRESA. O valor novo
 * vale a partir da próxima cobrança (a assinatura no MP é atualizada por quem chama).
 */
export async function subirParaEmpresa(
  professionalId: string,
): Promise<{ mudou: boolean; planPriceCents: number; mpPreapprovalId: string | null }> {
  const p = await prisma.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { plan: true, planPriceCents: true, mpPreapprovalId: true },
  });
  if (p.plan === "EMPRESA") {
    return { mudou: false, planPriceCents: p.planPriceCents, mpPreapprovalId: p.mpPreapprovalId };
  }
  const planPriceCents = Math.max(p.planPriceCents, PLANS.EMPRESA.priceCents);
  await prisma.professional.update({
    where: { id: professionalId },
    data: { plan: "EMPRESA", planPriceCents },
  });
  return { mudou: true, planPriceCents, mpPreapprovalId: p.mpPreapprovalId };
}
