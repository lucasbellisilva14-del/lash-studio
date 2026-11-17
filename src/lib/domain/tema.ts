/**
 * Tema do estúdio: a cor dos botões (accentColor) e o fundo (backgroundColor)
 * valem no app inteiro e no link de agendamento. O tema padrão é o visual
 * original do LashOS; com ele nada é sobrescrito.
 * Regras puras (servem no servidor e no client).
 */

export const TEMA_PADRAO = { accent: "#2A2240", bg: "#F3F3F6" } as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function temaPadrao(accent: string, bg: string): boolean {
  return (
    accent.toUpperCase() === TEMA_PADRAO.accent && bg.toUpperCase() === TEMA_PADRAO.bg
  );
}

/** Cor clara demais para texto branco por cima? (luminância relativa) */
function corClara(hex: string): boolean {
  const canal = (i: number) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  return l > 0.45;
}

/**
 * CSS que aplica o tema no app (variáveis no :root, para valer também em
 * modais e menus fora do fluxo). Devolve null no tema padrão ou se alguma
 * cor não for um hex válido.
 */
export function temaCss(accent: string, bg: string): string | null {
  if (!HEX.test(accent) || !HEX.test(bg) || temaPadrao(accent, bg)) return null;
  return `:root{--accent:${accent};--bg:${bg};--background:${bg};--accent-ink:${corClara(accent) ? "#17151e" : "#ffffff"};--accent-soft:color-mix(in srgb,${accent} 10%,white);--accent-strong:color-mix(in srgb,${accent} 85%,black);--accent-hover:color-mix(in srgb,${accent} 88%,black);--accent-glow:color-mix(in srgb,${accent} 50%,white);--surface-sunken:color-mix(in srgb,${bg} 45%,white);--line:color-mix(in srgb,${bg} 70%,#e8e8ed);--cat-aplicacao:color-mix(in srgb,${accent} 12%,white);}`;
}
