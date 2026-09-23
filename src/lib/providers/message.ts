/**
 * MessageProvider: todo envio de mensagem passa por aqui.
 * Fase 1: WaLinkProvider (gera link wa.me — envio manual em 2 toques).
 * Fase 3: MetaCloudApiProvider / EvolutionApiProvider entram sem tocar no resto.
 */
import { waLink } from "@/lib/phone";

export type OutgoingMessage = {
  /** Telefone BR só dígitos, com DDD. */
  phone: string;
  body: string;
};

export type PreparedMessage =
  | { mode: "LINK"; url: string } // abrir o link = enviar (manual)
  | { mode: "SENT" }; // provider enviou sozinho (API)

export interface MessageProvider {
  readonly name: string;
  /** Prepara (ou executa) o envio. */
  send(message: OutgoingMessage): Promise<PreparedMessage>;
}

export class WaLinkProvider implements MessageProvider {
  readonly name = "wa-link";
  async send(message: OutgoingMessage): Promise<PreparedMessage> {
    return { mode: "LINK", url: waLink(message.phone, message.body) };
  }
}

/**
 * Evolution API (WhatsApp self-hosted): envio real, sem toque manual.
 * Envs: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.
 */
export class EvolutionApiProvider implements MessageProvider {
  readonly name = "evolution";
  private readonly baseUrl = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
  private readonly apiKey = process.env.EVOLUTION_API_KEY ?? "";
  private readonly instance = process.env.EVOLUTION_INSTANCE ?? "";

  async send(message: OutgoingMessage): Promise<PreparedMessage> {
    const res = await fetch(
      `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.apiKey },
        body: JSON.stringify({ number: `55${message.phone}`, text: message.body }),
      },
    );
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`Evolution API: envio falhou (${res.status} ${detail})`);
    }
    return { mode: "SENT" };
  }
}

let provider: MessageProvider | null = null;

export function getMessageProvider(): MessageProvider {
  if (!provider) {
    provider =
      process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      process.env.EVOLUTION_INSTANCE
        ? new EvolutionApiProvider()
        : new WaLinkProvider();
  }
  return provider;
}

/** O provider ativo envia sozinho (API) em vez de gerar link manual? */
export function messageProviderIsAutomatic(): boolean {
  return getMessageProvider().name !== "wa-link";
}
