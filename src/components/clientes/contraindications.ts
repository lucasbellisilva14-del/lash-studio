/**
 * Labels legíveis das flags de contraindicação gravadas em
 * AnamnesisForm.contraindicationFlags (JSON array de strings).
 * Flags desconhecidas ganham um fallback humanizado — nunca some do alerta.
 */

export const CONTRAINDICATION_LABELS: Record<string, string> = {
  ALERGIA_CIANOACRILATO: "Alergia a cianoacrilato (cola)",
  GLAUCOMA_COLIRIO: "Glaucoma / colírio contínuo",
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

/** "CIRURGIA_REFRATIVA" → "Cirurgia refrativa" (fallback p/ flags fora do mapa). */
function humanizeFlag(flag: string): string {
  const text = flag.replaceAll("_", " ").toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function contraindicationLabel(flag: string): string {
  return CONTRAINDICATION_LABELS[flag] ?? humanizeFlag(flag);
}

/** Parse defensivo do JSON de flags. */
export function parseContraindicationFlags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
