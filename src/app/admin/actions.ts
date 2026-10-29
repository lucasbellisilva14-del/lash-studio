"use server";

/** Ações do painel admin (todas passam pelo requireAdmin). */
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parseBRL } from "@/lib/money";
import { isEmailTaken } from "@/lib/team";
import { criarEstudio } from "@/lib/domain/accounts";
import { isPlanKey } from "@/lib/domain/plans";
import { requireAdmin } from "./guard";

export type AdminState = { ok: boolean; error?: string; savedAt?: number };

function texto(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
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
  const planoBruto = texto(formData, "plano");
  const plan = isPlanKey(planoBruto) ? planoBruto : "SOLO";

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

  await criarEstudio({
    name,
    studioName,
    email,
    senha,
    plan,
    planPriceCents: precoCents,
    trialDias: Number.isFinite(trialDias) && trialDias > 0 ? trialDias : 0,
    signupSource: "ADMIN",
  });

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
