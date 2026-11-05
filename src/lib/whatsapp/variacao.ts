/**
 * Variação das mensagens: cada envio automático sai com um toque diferente
 * (saudação e coração), sem mudar a informação. E spintax nos modelos:
 * "{Oi|Olá|Oii}" vira uma das opções. Puro: serve no server e no client.
 */

/** Gerador pseudoaleatório com semente: a mesma semente dá a mesma escolha. */
export function sorteador(semente: string): () => number {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) {
    h = Math.imul(h ^ semente.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escolher<T>(opcoes: readonly T[], rnd: () => number): T {
  return opcoes[Math.min(opcoes.length - 1, Math.floor(rnd() * opcoes.length))];
}

/** "{Oi|Olá}" vira uma das opções. Não mexe em {{variáveis}} (sem barra). */
export function resolverSpintax(texto: string, rnd: () => number): string {
  return texto.replace(/(?<!\{)\{([^{}]*\|[^{}]*)\}(?!\})/g, (_, grupo: string) =>
    escolher(grupo.split("|"), rnd),
  );
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CORACOES = ["💗", "💖", "💕"] as const;

/**
 * Toque diferente a cada envio automático: troca a saudação inicial
 * ("Oi, Ana!" → "Olá, Ana!", "Ana, oi!"...) e o coração. O resto do texto
 * (datas, valores, Pix, link) não muda.
 */
export function variarMensagem(texto: string, primeiroNome: string, rnd: () => number): string {
  let saida = texto;
  if (primeiroNome) {
    const inicio = new RegExp(`^(?:Oi|Olá|Ola|Oii|Oie)[,!]?\\s+${escaparRegex(primeiroNome)}\\s*[!,.]`, "u");
    const casou = saida.match(inicio);
    if (casou) {
      // Se o texto já pergunta "tudo bem?" logo depois, não repete.
      const resto = saida.slice(casou[0].length, casou[0].length + 40).toLowerCase();
      const opcoes = [
        `Oi, ${primeiroNome}!`,
        `Olá, ${primeiroNome}!`,
        `Oii, ${primeiroNome}!`,
        `${primeiroNome}, oi!`,
        ...(resto.includes("tudo bem") ? [] : [`Oi, ${primeiroNome}, tudo bem?`]),
      ];
      saida = escolher(opcoes, rnd) + saida.slice(casou[0].length);
    }
  }
  return saida.replace(/💗|💖|💕/gu, () => escolher(CORACOES, rnd));
}

/** Intervalo aleatório entre mensagens (intervalo fixo é padrão de robô). */
export function intervaloEntreMensagensMs(rnd: () => number): number {
  return Math.round(12_000 + rnd() * 8_000);
}

/** Tempo de "digitando..." antes de enviar, proporcional ao tamanho do texto. */
export function tempoDigitandoMs(texto: string, rnd: () => number): number {
  const base = 1_500 + Math.min(3_500, texto.length * 12);
  return Math.round(base * (0.8 + rnd() * 0.4));
}
