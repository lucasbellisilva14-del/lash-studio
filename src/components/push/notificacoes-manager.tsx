"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { IconChevronRight } from "@/components/ui/icons";
import { FormError, SavedToast } from "@/components/config/feedback";
import {
  enviarTesteAction,
  removerInscricaoAction,
  salvarInscricaoAction,
} from "@/app/(app)/config/notificacoes/actions";

/**
 * Gerencia a inscrição de push DESTE aparelho:
 * checa suporte/estado atual, ativa (permissão + subscribe + salva no servidor),
 * desativa (unsubscribe + remove do servidor) e dispara a notificação de teste.
 * Push só funciona em HTTPS ou localhost — fora disso mostramos aviso amigável.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type DeviceStatus = "verificando" | "sem-suporte" | "ativado" | "desativado";
type BusyAction = "ativar" | "desativar" | "teste" | null;

/** Converte a chave VAPID (base64url) no formato que o pushManager espera. */
function urlBase64ToUint8Array(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );
}

export function NotificacoesManager({ dailySummaryTime }: { dailySummaryTime: string }) {
  const [status, setStatus] = useState<DeviceStatus>("verificando");
  const [supportMessage, setSupportMessage] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSentAt, setTestSentAt] = useState<number | undefined>(undefined);

  // Estado atual deste aparelho: existe inscrição ativa no service worker?
  useEffect(() => {
    let cancelled = false;

    async function verificar() {
      if (!pushSupported()) {
        if (cancelled) return;
        setStatus("sem-suporte");
        setSupportMessage(
          "Este navegador não suporta notificações push. No iPhone, instale o LashOS na tela de início (Safari → Compartilhar → Adicionar à Tela de Início) e tente por lá.",
        );
        return;
      }
      if (!window.isSecureContext) {
        if (cancelled) return;
        setStatus("sem-suporte");
        setSupportMessage(
          "Notificações só funcionam em conexões seguras (HTTPS) — ou em localhost, durante o desenvolvimento.",
        );
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (cancelled) return;
        setBlocked(Notification.permission === "denied");
        setStatus(subscription ? "ativado" : "desativado");
      } catch {
        if (!cancelled) setStatus("desativado");
      }
    }

    void verificar();
    return () => {
      cancelled = true;
    };
  }, []);

  async function ativar() {
    setBusy("ativar");
    setError(null);
    try {
      if (!VAPID_PUBLIC_KEY) {
        setError("Chave de notificações não configurada no servidor. Fale com o suporte.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setBlocked(permission === "denied");
        setError(
          permission === "denied"
            ? "O navegador está bloqueando notificações do LashOS. Libere nas configurações do site e tente de novo."
            : "Permissão não concedida. Toque em “Permitir” quando o navegador perguntar.",
        );
        return;
      }
      setBlocked(false);

      // Em produção o SW já está registrado; em dev registramos aqui mesmo.
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        await subscription.unsubscribe();
        setError("Não foi possível criar a inscrição neste navegador. Tente novamente.");
        return;
      }

      const result = await salvarInscricaoAction({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      if (!result.ok) {
        await subscription.unsubscribe();
        setError(result.error);
        return;
      }

      setStatus("ativado");
    } catch {
      setError(
        "Não foi possível ativar as notificações. Confira se está em HTTPS (ou localhost) e tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function desativar() {
    setBusy("desativar");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        const result = await removerInscricaoAction(endpoint);
        if (!result.ok) setError(result.error);
      }
      setStatus("desativado");
    } catch {
      setError("Não foi possível desativar neste aparelho. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function enviarTeste() {
    setBusy("teste");
    setError(null);
    try {
      const result = await enviarTesteAction();
      if (result.ok) setTestSentAt(Date.now());
      else setError(result.error);
    } catch {
      setError("Não foi possível enviar a notificação de teste. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Este aparelho */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Neste aparelho</h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              As notificações valem por aparelho — ative no celular que você usa no dia a dia.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-3.5 py-3">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0",
                status === "ativado" ? "bg-success" : "bg-ink-faint",
                status === "verificando" && "animate-pulse",
              )}
            />
            <p className="text-sm font-medium text-ink">
              {status === "verificando"
                ? "Verificando este aparelho..."
                : status === "ativado"
                  ? "Notificações ativadas neste aparelho"
                  : status === "sem-suporte"
                    ? "Notificações indisponíveis neste navegador"
                    : "Notificações desativadas neste aparelho"}
            </p>
          </div>

          {status === "sem-suporte" && supportMessage ? (
            <p className="text-[13px] text-ink-soft bg-surface-sunken rounded-xl px-3.5 py-2.5 leading-relaxed">
              {supportMessage}
            </p>
          ) : null}

          {blocked && status === "desativado" ? (
            <p className="text-[13px] text-danger bg-danger-soft rounded-xl px-3.5 py-2.5 leading-relaxed">
              O navegador está bloqueando notificações do LashOS. Libere nas
              configurações do site (cadeado na barra de endereço) e volte aqui.
            </p>
          ) : null}

          {status === "desativado" ? (
            <Button size="lg" onClick={ativar} disabled={busy !== null}>
              {busy === "ativar" ? "Ativando..." : "Ativar notificações neste aparelho"}
            </Button>
          ) : null}

          {status === "ativado" ? (
            <div className="space-y-2.5">
              <Button
                size="lg"
                variant="secondary"
                onClick={enviarTeste}
                disabled={busy !== null}
              >
                {busy === "teste" ? "Enviando..." : "Enviar notificação de teste"}
              </Button>
              <Button
                size="lg"
                variant="danger-soft"
                onClick={desativar}
                disabled={busy !== null}
              >
                {busy === "desativar" ? "Desativando..." : "Desativar neste aparelho"}
              </Button>
            </div>
          ) : null}

          <FormError error={error ?? undefined} />
        </CardBody>
      </Card>

      {/* Resumo diário */}
      <Card>
        <CardBody className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Resumo diário</h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              Comece o dia sabendo de tudo, sem abrir o app.
            </p>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            Com as notificações ativas, você recebe todo dia por volta das{" "}
            <strong className="font-semibold text-ink">{dailySummaryTime}</strong> um resumo
            com a agenda do dia, sinais pendentes, fila de mensagens, manutenções,
            aniversariantes e alertas de estoque.
          </p>
          <Link
            href="/config/politicas"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-accent-strong"
          >
            Alterar horário em Políticas
            <IconChevronRight width={16} height={16} />
          </Link>
        </CardBody>
      </Card>

      <SavedToast savedAt={testSentAt} message="Notificação de teste enviada!" />
    </div>
  );
}
