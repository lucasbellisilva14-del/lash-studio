"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { sendPushToProfessional } from "@/components/push/send";

/** Resultado das ações de push (consumido direto pelo client component). */
export type PushActionResult = { ok: true } | { ok: false; error: string };

const inscricaoSchema = z.object({
  endpoint: z.url({ error: "Inscrição de push inválida." }).max(2000),
  p256dh: z.string().min(1, "Inscrição de push inválida.").max(512),
  auth: z.string().min(1, "Inscrição de push inválida.").max(512),
});

/** Salva (ou renova) a inscrição de push deste aparelho. */
export async function salvarInscricaoAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushActionResult> {
  const professionalId = await requireProfessionalId();

  const parsed = inscricaoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Inscrição de push inválida. Tente ativar novamente." };
  }
  const { endpoint, p256dh, auth } = parsed.data;

  try {
    // endpoint é único: se o aparelho já estava inscrito (até em outra conta),
    // a inscrição passa a valer para quem está logada agora.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { professionalId, endpoint, p256dh, auth },
      update: { professionalId, p256dh, auth },
    });
  } catch {
    return { ok: false, error: "Não foi possível salvar a inscrição. Tente novamente." };
  }

  revalidatePath("/config/notificacoes");
  revalidatePath("/config");
  return { ok: true };
}

/** Remove do banco a inscrição deste aparelho (após o unsubscribe no navegador). */
export async function removerInscricaoAction(endpoint: string): Promise<PushActionResult> {
  const professionalId = await requireProfessionalId();

  if (!endpoint || typeof endpoint !== "string") {
    return { ok: false, error: "Inscrição não encontrada." };
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { professionalId, endpoint },
    });
  } catch {
    return { ok: false, error: "Não foi possível remover a inscrição. Tente novamente." };
  }

  revalidatePath("/config/notificacoes");
  revalidatePath("/config");
  return { ok: true };
}

/** Envia uma notificação de teste para todos os aparelhos da profissional. */
export async function enviarTesteAction(): Promise<PushActionResult> {
  const professionalId = await requireProfessionalId();

  try {
    const result = await sendPushToProfessional(professionalId, {
      title: "Notificação de teste",
      body: "Tudo certo! 💗 As notificações do LashOS estão ativas.",
      url: "/config/notificacoes",
    });

    if (result.total === 0) {
      return {
        ok: false,
        error: "Nenhum aparelho inscrito ainda. Ative as notificações primeiro.",
      };
    }
    if (result.sent === 0) {
      return {
        ok: false,
        error:
          "A notificação não chegou a nenhum aparelho. Desative e ative de novo por aqui.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Não foi possível enviar. Confira as chaves de notificação do servidor.",
    };
  }
}
