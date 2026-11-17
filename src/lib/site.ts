/**
 * Endereço oficial do LashOS. Todo link que sai do app para outra pessoa
 * (agendamento, convite, indicação, textos da bio, mensagens) usa este
 * domínio — nunca o endereço técnico da Vercel por onde alguém abriu o app.
 * Regra pura: serve no servidor e no client.
 */
export const SITE_ORIGIN = "https://www.lashos.com.br";

/** Troca o endereço técnico (*.vercel.app) pelo oficial; o resto fica como está (ex.: localhost). */
export function origemPublica(origem: string): string {
  try {
    return new URL(origem).hostname.endsWith(".vercel.app") ? SITE_ORIGIN : origem;
  } catch {
    return origem;
  }
}
