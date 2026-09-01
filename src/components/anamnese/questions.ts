/**
 * Definições da anamnese digital: perguntas sim/não, mapeamento para as flags
 * de contraindicação (MESMAS chaves lidas por
 * `@/components/clientes/contraindications` — o alerta vermelho do perfil e da
 * agenda parseia essas chaves) e o termo de consentimento padrão.
 */

export type AnamnesisQuestionId =
  | "gestante_lactante"
  | "alergias"
  | "glaucoma_colirio"
  | "irritacao_ocular"
  | "cirurgia_ocular"
  | "lentes_contato"
  | "tireoide_oncologico"
  | "extensao_anterior";

export type AnamnesisQuestion = {
  id: AnamnesisQuestionId;
  label: string;
  /** Observação curta exibida sob a pergunta. */
  hint?: string;
  /** Placeholder do campo de detalhe exibido quando a resposta é "sim". */
  detailPlaceholder: string;
  /** Flag de contraindicação disparada quando a resposta é "sim". */
  flag?: string;
};

/** Flag disparada pelo checkbox específico de alergia à cola. */
export const FLAG_ALERGIA_CIANOACRILATO = "ALERGIA_CIANOACRILATO";

export const ANAMNESIS_QUESTIONS: readonly AnamnesisQuestion[] = [
  {
    id: "gestante_lactante",
    label: "Está gestante ou amamentando?",
    detailPlaceholder: "Semanas de gestação, liberação médica...",
    flag: "GESTANTE_LACTANTE",
  },
  {
    id: "alergias",
    label: "Tem alergias conhecidas?",
    hint: "Cosméticos, esmaltes, medicamentos, látex...",
    detailPlaceholder: "Quais alergias? Descreva.",
    // Sem flag automática: só o checkbox de cianoacrilato contraindica.
  },
  {
    id: "glaucoma_colirio",
    label: "Tem glaucoma ou usa colírio contínuo?",
    detailPlaceholder: "Qual colírio / tratamento?",
    flag: "GLAUCOMA_COLIRIO",
  },
  {
    id: "irritacao_ocular",
    label: "Teve blefarite, conjuntivite, terçol ou irritação ocular recente?",
    detailPlaceholder: "Quando foi e como está agora?",
    flag: "IRRITACAO_OCULAR_RECENTE",
  },
  {
    id: "cirurgia_ocular",
    label: "Fez cirurgia ocular nos últimos 6 meses?",
    detailPlaceholder: "Qual cirurgia e quando?",
    flag: "CIRURGIA_OCULAR_6M",
  },
  {
    id: "lentes_contato",
    label: "Usa lentes de contato?",
    hint: "Retirar as lentes antes da aplicação.",
    detailPlaceholder: "Com que frequência?",
  },
  {
    id: "tireoide_oncologico",
    label: "Tem disfunção de tireoide ou está em tratamento oncológico?",
    hint: "Pode afetar a retenção dos fios.",
    detailPlaceholder: "Qual condição / tratamento?",
    flag: "TIREOIDE_ONCOLOGICO",
  },
  {
    id: "extensao_anterior",
    label: "Já fez extensão de cílios antes?",
    detailPlaceholder: "Teve alguma reação? Conte como foi.",
  },
];

export type AnamnesisAnswer = { sim: boolean; detalhe: string };

export type ParsedAnamnesis = {
  respostas: Partial<Record<AnamnesisQuestionId, AnamnesisAnswer>>;
  alergiaCianoacrilato: boolean;
};

/** Formato da Fase 1 (seed): chaves camelCase soltas → converte para o atual. */
function parseLegacyAnswers(raw: Record<string, unknown>): ParsedAnamnesis | null {
  const legacyKeys = ["gestanteOuLactante", "glaucomaOuColirio", "jaFezExtensao"];
  if (!legacyKeys.some((k) => k in raw)) return null;
  const yes = (v: unknown): boolean =>
    v === true || (typeof v === "string" && v.trim() !== "");
  const detail = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  return {
    respostas: {
      gestante_lactante: { sim: yes(raw.gestanteOuLactante), detalhe: detail(raw.gestanteOuLactante) },
      alergias: { sim: yes(raw.alergias), detalhe: detail(raw.alergias) },
      glaucoma_colirio: { sim: yes(raw.glaucomaOuColirio), detalhe: detail(raw.glaucomaOuColirio) },
      irritacao_ocular: { sim: yes(raw.irritacaoOcularRecente), detalhe: detail(raw.irritacaoOcularRecente) },
      cirurgia_ocular: { sim: yes(raw.cirurgiaOcular6m), detalhe: detail(raw.cirurgiaOcular6m) },
      lentes_contato: { sim: yes(raw.lentesDeContato), detalhe: detail(raw.lentesDeContato) },
      tireoide_oncologico: { sim: yes(raw.tireoideOuOncologico), detalhe: detail(raw.tireoideOuOncologico) },
      extensao_anterior: { sim: yes(raw.jaFezExtensao), detalhe: detail(raw.reacaoAnterior) },
    },
    alergiaCianoacrilato: false, // no legado, vem da flag gravada (mesclada na página)
  };
}

/** Parse defensivo de AnamnesisForm.answersJson (aceita o formato legado). */
export function parseAnamnesisAnswers(json: string | null | undefined): ParsedAnamnesis {
  const empty: ParsedAnamnesis = { respostas: {}, alergiaCianoacrilato: false };
  if (!json) return empty;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return empty;
    const legacy = parseLegacyAnswers(parsed as Record<string, unknown>);
    if (legacy) return legacy;
    const raw = parsed as {
      respostas?: unknown;
      alergiaCianoacrilato?: unknown;
    };
    const respostas: ParsedAnamnesis["respostas"] = {};
    if (raw.respostas && typeof raw.respostas === "object") {
      for (const q of ANAMNESIS_QUESTIONS) {
        const r = (raw.respostas as Record<string, unknown>)[q.id];
        if (r && typeof r === "object" && typeof (r as { sim?: unknown }).sim === "boolean") {
          const detalhe = (r as { detalhe?: unknown }).detalhe;
          respostas[q.id] = {
            sim: (r as { sim: boolean }).sim,
            detalhe: typeof detalhe === "string" ? detalhe : "",
          };
        }
      }
    }
    return { respostas, alergiaCianoacrilato: raw.alergiaCianoacrilato === true };
  } catch {
    return empty;
  }
}

/** Termo padrão usado quando a profissional ainda não personalizou o dela. */
export const DEFAULT_CONSENT_TEXT = `TERMO DE CONSENTIMENTO — EXTENSÃO DE CÍLIOS

Declaro que fui informada sobre o procedimento de extensão de cílios, incluindo a técnica utilizada, os produtos aplicados (entre eles adesivos à base de cianoacrilato) e os cuidados necessários após a aplicação.

Declaro que as informações de saúde fornecidas nesta ficha de anamnese são verdadeiras e completas, e estou ciente de que qualquer omissão pode comprometer o resultado do procedimento e a minha segurança.

Estou ciente de que, embora raras, podem ocorrer reações alérgicas ou irritações. Comprometo-me a avisar a profissional imediatamente caso perceba desconforto, vermelhidão, coceira ou inchaço, e a seguir as orientações de manutenção e higienização repassadas.

Autorizo a realização do procedimento e declaro estar de acordo com este termo.`;
