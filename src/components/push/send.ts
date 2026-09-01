import "server-only";
import webpush, { WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Envio de web push (VAPID) para os aparelhos inscritos da profissional.
 * O public/sw.js exibe o payload JSON { title, body, url }.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** Rota aberta ao tocar na notificação (padrão "/"). */
  url?: string;
};

export type PushSendResult = {
  /** Inscrições encontradas para a profissional. */
  total: number;
  /** Pushes aceitos pelo serviço de push. */
  sent: number;
  /** Inscrições mortas (404/410) removidas do banco. */
  removed: number;
};

let vapidReady = false;

/** Configura o web-push uma única vez por processo. Lança erro se faltar chave. */
function ensureVapid(): void {
  if (vapidReady) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "Chaves VAPID ausentes: configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@lashos.app",
    publicKey,
    privateKey,
  );
  vapidReady = true;
}

/**
 * Envia uma notificação para TODOS os aparelhos inscritos da profissional.
 * Inscrições que o serviço de push reportar como mortas (404/410) são
 * apagadas do banco — o próximo envio já não tenta de novo.
 */
export async function sendPushToProfessional(
  professionalId: string,
  message: PushMessage,
): Promise<PushSendResult> {
  ensureVapid();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { professionalId },
  });

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url ?? "/",
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        const gone =
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410);
        if (gone) {
          await prisma.pushSubscription
            .deleteMany({ where: { id: subscription.id } })
            .catch(() => undefined);
          removed += 1;
        }
        // Outros erros (rede, chave inválida...): segue para as demais inscrições.
      }
    }),
  );

  return { total: subscriptions.length, sent, removed };
}
