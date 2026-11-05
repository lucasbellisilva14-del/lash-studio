import "server-only";

/**
 * Cliente do servidor de WhatsApp (Evolution API v2, conexão Baileys pelo
 * QR code / código de pareamento). Uma instância por estúdio.
 * O LashOS só ENVIA: a instância nasce sem ler mensagens, sem histórico e
 * ignorando grupos. Envs: EVOLUTION_API_URL e EVOLUTION_API_KEY (chave global).
 * As respostas são lidas com tolerância: a forma muda um pouco entre versões.
 */

const TIMEOUT_MS = 20_000;

export type EstadoConexao = "open" | "connecting" | "close" | "desconhecido";

export class WhatsAppErro extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "WhatsAppErro";
  }
}

export function whatsappDisponivel(): boolean {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY);
}

/** Nome da instância do estúdio no servidor. */
export function nomeDaInstancia(professionalId: string): string {
  return `lashos-${professionalId}`;
}

/** Telefone salvo (DDD + número) → formato internacional do WhatsApp. */
export function numeroInternacional(phone: string): string {
  const digitos = phone.replace(/\D/g, "");
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

type Resposta = { status: number; data: unknown };

async function chamar(caminho: string, init: { method?: string; body?: unknown } = {}): Promise<Resposta> {
  const base = (process.env.EVOLUTION_API_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(`${base}${caminho}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: process.env.EVOLUTION_API_KEY ?? "",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const texto = await res.text();
  let data: unknown = texto;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    // resposta em texto puro
  }
  return { status: res.status, data };
}

function ok(r: Resposta): boolean {
  return r.status >= 200 && r.status < 300;
}

function erro(acao: string, r: Resposta): WhatsAppErro {
  const detalhe = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  return new WhatsAppErro(`WhatsApp (${acao}): ${r.status} ${String(detalhe).slice(0, 300)}`, r.status);
}

function obj(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
}

/** Cria a instância do estúdio; se já existe, segue sem erro. */
export async function garantirInstancia(instanceName: string): Promise<void> {
  const r = await chamar("/instance/create", {
    method: "POST",
    body: {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      rejectCall: false,
    },
  });
  if (ok(r)) return;
  const texto = JSON.stringify(r.data ?? "").toLowerCase();
  if (r.status === 403 || r.status === 409 || texto.includes("already") || texto.includes("in use")) return;
  throw erro("criar instância", r);
}

export type CodigoDeConexao = { qrBase64: string | null; pairingCode: string | null };

/**
 * Pede a conexão: QR code (para ler de outro aparelho) e, com o número,
 * o código de pareamento (para quem usa o LashOS no próprio celular).
 */
export async function pedirConexao(instanceName: string, numero?: string | null): Promise<CodigoDeConexao> {
  const consulta = numero ? `?number=${encodeURIComponent(numero)}` : "";
  const r = await chamar(`/instance/connect/${encodeURIComponent(instanceName)}${consulta}`);
  if (!ok(r)) throw erro("conectar", r);
  const d = obj(r.data);
  const qr = obj(d.qrcode);
  const base64 = (d.base64 ?? qr.base64 ?? null) as unknown;
  const pairing = (d.pairingCode ?? qr.pairingCode ?? null) as unknown;
  return {
    qrBase64:
      typeof base64 === "string" && base64.length > 40
        ? base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`
        : null,
    pairingCode: typeof pairing === "string" && pairing.replace(/\W/g, "").length >= 6 ? pairing : null,
  };
}

export async function estadoDaConexao(instanceName: string): Promise<EstadoConexao> {
  const r = await chamar(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
  if (r.status === 404) return "close";
  if (!ok(r)) throw erro("estado", r);
  const d = obj(r.data);
  const estado = (obj(d.instance).state ?? d.state) as unknown;
  return estado === "open" || estado === "connecting" || estado === "close" ? estado : "desconhecido";
}

/** Número e nome do perfil do WhatsApp conectado. */
export async function perfilConectado(instanceName: string): Promise<{ phone: string | null; profileName: string | null }> {
  const r = await chamar(`/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
  if (!ok(r)) return { phone: null, profileName: null };
  const item = obj(Array.isArray(r.data) ? r.data[0] : r.data);
  const inst = Object.keys(obj(item.instance)).length > 0 ? obj(item.instance) : item;
  const dono = (inst.ownerJid ?? inst.owner ?? item.ownerJid ?? "") as unknown;
  const phone = typeof dono === "string" && dono ? dono.split("@")[0].split(":")[0].replace(/\D/g, "") : "";
  const nome = (inst.profileName ?? item.profileName ?? null) as unknown;
  return { phone: phone || null, profileName: typeof nome === "string" && nome ? nome : null };
}

/**
 * Apaga a instância (desconecta antes, se preciso) e espera ela sumir do
 * servidor. Serve para começar uma conexão do zero: trocar QR por código,
 * código expirado, tentativa abandonada.
 */
export async function apagarInstancia(instanceName: string): Promise<void> {
  const nome = encodeURIComponent(instanceName);
  const r = await chamar(`/instance/delete/${nome}`, { method: "DELETE" });
  if (!ok(r) && r.status !== 400 && r.status !== 404) throw erro("apagar instância", r);
  for (let i = 0; i < 10; i++) {
    const estado = await chamar(`/instance/connectionState/${nome}`);
    if (estado.status === 404) return;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

/** Desconecta o WhatsApp (o aparelho some de "Aparelhos conectados"). */
export async function desligar(instanceName: string): Promise<void> {
  const r = await chamar(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
  if (ok(r) || r.status === 400 || r.status === 404) return;
  throw erro("desconectar", r);
}

/**
 * O número tem WhatsApp? Devolve o número exato que o WhatsApp usa (resolve o
 * nono dígito de números antigos) ou null se não tiver.
 */
export async function numeroNoWhatsapp(instanceName: string, numero: string): Promise<string | null> {
  const r = await chamar(`/chat/whatsappNumbers/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: { numbers: [numero] },
  });
  if (!ok(r)) throw erro("checar número", r);
  const item = obj(Array.isArray(r.data) ? r.data[0] : null);
  if (item.exists === false) return null;
  const jid = item.jid;
  return typeof jid === "string" && jid.includes("@") ? jid.split("@")[0] : numero;
}

/** Envia o texto mostrando "digitando..." por `digitandoMs` antes. */
export async function enviarTexto(
  instanceName: string,
  numero: string,
  texto: string,
  digitandoMs: number,
): Promise<void> {
  const r = await chamar(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: { number: numero, text: texto, delay: digitandoMs, linkPreview: true },
  });
  if (!ok(r)) throw erro("enviar", r);
}
