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

let provider: MessageProvider | null = null;

export function getMessageProvider(): MessageProvider {
  if (!provider) provider = new WaLinkProvider();
  return provider;
}
