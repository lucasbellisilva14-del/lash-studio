"use server";

/** Ações do painel admin (todas passam pelo requireAdmin). */
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseBRL } from "@/lib/money";
import { isEmailTaken } from "@/lib/team";
import { requireAdmin } from "./guard";

export type AdminState = { ok: boolean; error?: string; savedAt?: number };

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

/** Slug único a partir do nome do estúdio. */
async function gerarSlug(studioName: string): Promise<string> {
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

/** Cria uma conta nova, clonando serviços/templates/horários de um modelo. */
export async function criarContaAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const name = texto(formData, "name");
  const studioName = texto(formData, "studioName");
  const email = texto(formData, "email").toLowerCase();
  const senha = texto(formData, "senha");
  const precoBRL = texto(formData, "preco");
  const trialDias = Number.parseInt(texto(formData, "trialDias"), 10);

  if (name.length < 2 || studioName.length < 2) {
    return { ok: false, error: "Preencha nome e estúdio." };
  }
  if (!email.includes("@")) return { ok: false, error: "E-mail inválido." };
  if (senha.length < 8) return { ok: false, error: "Senha precisa de 8+ caracteres." };
  const precoCents = parseBRL(precoBRL);
  if (precoCents === null || precoCents < 0) {
    return { ok: false, error: "Preço inválido — ex.: 99,00." };
  }
  if (await isEmailTaken(email)) {
    return { ok: false, error: "Já existe conta (ou alguém de equipe) com esse e-mail." };
  }

  // Modelo: a conta mais antiga (Kay) — serviços/templates/horários prontos.
  const modelo = await prisma.professional.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      workingHours: true,
      paymentFees: true,
      messageTemplates: true,
      services: { where: { active: true } },
    },
  });

  const emTrial = Number.isFinite(trialDias) && trialDias > 0;
  const nova = await prisma.professional.create({
    data: {
      email,
      passwordHash: bcrypt.hashSync(senha, 10),
      name,
      studioName,
      slug: await gerarSlug(studioName),
      planPriceCents: precoCents,
      subscriptionStatus: emTrial ? "TRIAL" : "ATIVA",
      trialEndsAt: emTrial ? addDays(new Date(), trialDias) : null,
      subscriptionPaidUntil: emTrial ? null : addDays(new Date(), 30),
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
          maintenanceOfId: mapa.get(s.maintenanceOfId!) ?? null,
        },
      });
    }
  }

  revalidatePath("/admin");
  return { ok: true, savedAt: Date.now() };
}

/** Suspende / reativa o acesso (dados intactos). */
export async function alternarSuspensaoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = texto(formData, "id");
  const p = await prisma.professional.findUnique({
    where: { id },
    select: { subscriptionStatus: true },
  });
  if (!p) return;
  await prisma.professional.update({
    where: { id },
    data: {
      subscriptionStatus: p.subscriptionStatus === "SUSPENSA" ? "ATIVA" : "SUSPENSA",
      ...(p.subscriptionStatus === "SUSPENSA"
        ? { subscriptionPaidUntil: addDays(new Date(), 30) }
        : {}),
    },
  });
  revalidatePath("/admin");
}

/** Registro de pagamento manual: +30 dias de validade (vira ATIVA). */
export async function adicionarTrintaDiasAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = texto(formData, "id");
  const p = await prisma.professional.findUnique({
    where: { id },
    select: { subscriptionPaidUntil: true },
  });
  if (!p) return;
  const base =
    p.subscriptionPaidUntil && p.subscriptionPaidUntil > new Date()
      ? p.subscriptionPaidUntil
      : new Date();
  await prisma.professional.update({
    where: { id },
    data: { subscriptionStatus: "ATIVA", subscriptionPaidUntil: addDays(base, 30) },
  });
  revalidatePath("/admin");
}

/** Muda a conta para cortesia (nunca bloqueia — casos especiais/piloto). */
export async function tornarCortesiaAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.professional.update({
    where: { id: texto(formData, "id") },
    data: { subscriptionStatus: "CORTESIA" },
  });
  revalidatePath("/admin");
}

/** Suporte: marca a mensagem como resolvida (some da caixa de entrada). */
export async function resolverSuporteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.supportMessage.update({
    where: { id: texto(formData, "id") },
    data: { status: "RESOLVIDA", resolvedAt: new Date() },
  });
  revalidatePath("/admin");
}
