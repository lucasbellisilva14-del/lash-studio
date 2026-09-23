import "server-only";

/**
 * OAuth do Mercado Pago ("Conectar Mercado Pago"): cada profissional
 * autoriza a conta DELA — o sinal cai direto pra ela.
 * Envs do app: MP_CLIENT_ID, MP_CLIENT_SECRET.
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export function mpOauthDisponivel(): boolean {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET);
}

/* ── state assinado (anti-CSRF): professionalId.ts.hmac ── */

function assinarState(professionalId: string, ts: number): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return crypto
    .createHmac("sha256", `mp-state:${secret}`)
    .update(`${professionalId}.${ts}`)
    .digest("base64url");
}

export function gerarState(professionalId: string): string {
  const ts = Date.now();
  return `${professionalId}.${ts}.${assinarState(professionalId, ts)}`;
}

/** Valida o state e devolve o professionalId (null se inválido/vencido). */
export function validarState(state: string): string | null {
  const [professionalId, tsRaw, mac] = state.split(".");
  const ts = Number(tsRaw);
  if (!professionalId || !Number.isFinite(ts) || !mac) return null;
  if (Date.now() - ts > 15 * 60 * 1000) return null; // 15 min
  const esperado = assinarState(professionalId, ts);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(mac))) return null;
  } catch {
    return null;
  }
  return professionalId;
}

/* ── fluxo OAuth ── */

export function urlAutorizacao(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: redirectUri,
  });
  return `https://auth.mercadopago.com.br/authorization?${params}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos (~180 dias)
  user_id: number;
};

async function chamarOauthToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`MP OAuth falhou (${res.status} ${(await res.text()).slice(0, 300)})`);
  }
  return (await res.json()) as TokenResponse;
}

/** Troca o code do callback e grava os tokens (cifrados) na profissional. */
export async function conectarConta(
  professionalId: string,
  code: string,
  redirectUri: string,
): Promise<void> {
  const t = await chamarOauthToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      mpUserId: String(t.user_id),
      mpAccessToken: encryptSecret(t.access_token),
      mpRefreshToken: encryptSecret(t.refresh_token),
      mpTokenExpiresAt: new Date(Date.now() + t.expires_in * 1000),
      mpConnectedAt: new Date(),
    },
  });
}

export async function desconectarConta(professionalId: string): Promise<void> {
  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      mpUserId: null,
      mpAccessToken: null,
      mpRefreshToken: null,
      mpTokenExpiresAt: null,
      mpConnectedAt: null,
    },
  });
}

/**
 * Access token válido da profissional (renova sozinho quando falta <14 dias).
 * null = conta não conectada (ou renovação impossível — reconectar).
 */
export async function tokenDaProfissional(professionalId: string): Promise<string | null> {
  const p = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { mpAccessToken: true, mpRefreshToken: true, mpTokenExpiresAt: true },
  });
  if (!p?.mpAccessToken) return null;

  const precisaRenovar =
    !p.mpTokenExpiresAt || p.mpTokenExpiresAt.getTime() - Date.now() < 14 * 24 * 3600_000;

  if (!precisaRenovar) return decryptSecret(p.mpAccessToken);

  try {
    const t = await chamarOauthToken({
      grant_type: "refresh_token",
      refresh_token: decryptSecret(p.mpRefreshToken ?? ""),
    });
    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        mpAccessToken: encryptSecret(t.access_token),
        mpRefreshToken: encryptSecret(t.refresh_token),
        mpTokenExpiresAt: new Date(Date.now() + t.expires_in * 1000),
      },
    });
    return t.access_token;
  } catch (e) {
    console.error("[mp] renovação de token falhou:", e);
    // Token atual ainda pode valer — usa até o fim; senão a UI pede reconexão.
    return p.mpTokenExpiresAt && p.mpTokenExpiresAt.getTime() > Date.now()
      ? decryptSecret(p.mpAccessToken)
      : null;
  }
}
