/**
 * Rótulos legíveis das flags de contraindicação gravadas em
 * AnamnesisForm.contraindicationFlags (JSON array de strings).
 *
 * Dois tipos de flag convivem:
 * - Chaves em CAIXA_ALTA (perguntas do formulário antigo, que continuam
 *   gerando as mesmas chaves, e registros anteriores): rótulo do mapa abaixo
 *   ou, se a chave não estiver no mapa, humanizado.
 * - Perguntas personalizadas com alerta: a flag é o próprio texto da
 *   pergunta como foi feita no dia (ver @/lib/domain/anamnesis-model), então
 *   o rótulo é ela mesma, em qualquer tela, mesmo sem o retrato da anamnese.
 *
 * Flag desconhecida nunca some do alerta nem quebra a tela.
 */

export const CONTRAINDICATION_LABELS: Record<string, string> = {
  ALERGIA_CIANOACRILATO: "Alergia a cianoacrilato (cola)",
  GLAUCOMA_COLIRIO: "Glaucoma / colírio contínuo",
  REACAO_EXTENSAO: "Reação anterior a extensão ou cola",
  DOENCA_OCULAR: "Doença ocular",
  GESTANTE: "Gestante",
  LACTANTE: "Lactante",
  GESTANTE_LACTANTE: "Gestante ou lactante",
  IRRITACAO_OCULAR: "Irritação ocular recente",
  IRRITACAO_OCULAR_RECENTE: "Irritação ocular recente",
  CONJUNTIVITE: "Conjuntivite recente",
  BLEFARITE: "Blefarite",
  CIRURGIA_OCULAR_6M: "Cirurgia ocular nos últimos 6 meses",
  CIRURGIA_OCULAR_RECENTE: "Cirurgia ocular recente",
  TIREOIDE_ONCOLOGICO: "Alteração de tireoide / tratamento oncológico",
  TIREOIDE: "Alteração de tireoide",
  ONCOLOGICO: "Tratamento oncológico",
  QUIMIOTERAPIA: "Quimioterapia",
  ALERGIA_LATEX: "Alergia a látex",
  DERMATITE_OCULAR: "Dermatite na região dos olhos",
  TRICOTILOMANIA: "Tricotilomania",
};

/** Formato de chave fixa: "CIRURGIA_OCULAR_6M". */
const FLAG_KEY = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

const FALLBACK_LABEL = "Contraindicação na anamnese";

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** "CIRURGIA_REFRATIVA" → "Cirurgia refrativa" (chaves fora do mapa). */
function humanizeFlag(flag: string): string {
  const text = flag.replaceAll("_", " ").toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Rótulo de uma flag. Um parâmetro só, de propósito: é usado direto em
 * `.map(contraindicationLabel)`.
 */
export function contraindicationLabel(flag: string): string {
  const key = typeof flag === "string" ? flag.trim() : "";
  if (!key) return FALLBACK_LABEL;
  if (hasOwn(CONTRAINDICATION_LABELS, key)) return CONTRAINDICATION_LABELS[key];
  if (FLAG_KEY.test(key)) return humanizeFlag(key);
  // Pergunta personalizada: a flag já é o texto da pergunta como foi feita.
  return key;
}

/**
 * Rótulos com o retrato da anamnese em mãos (tela da anamnese): uma flag que
 * seja o id de uma pergunta do retrato vira o texto dela. Sem repetição.
 */
export function contraindicationLabels(
  flags: readonly string[],
  questions?: readonly { id: string; text: string }[],
): string[] {
  const labels: string[] = [];
  for (const flag of flags) {
    const fromQuestion = questions?.find((question) => question.id === flag)?.text.trim();
    const label = fromQuestion || contraindicationLabel(flag);
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

/** Parse defensivo do JSON de flags: só textos, sem vazios nem repetições. */
export function parseContraindicationFlags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const flags: string[] = [];
    for (const item of parsed) {
      const flag =
        typeof item === "string" ? item.trim() : typeof item === "number" ? String(item) : "";
      if (flag && !flags.includes(flag)) flags.push(flag);
    }
    return flags;
  } catch {
    return [];
  }
}
