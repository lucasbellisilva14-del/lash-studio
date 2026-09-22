/**
 * Definições da anamnese digital: perguntas sim/não, mapeamento para as flags
 * de contraindicação (MESMAS chaves lidas por
 * `@/components/clientes/contraindications` — o alerta vermelho do perfil e da
 * agenda parseia essas chaves) e o termo de consentimento padrão.
 */

export type AnamnesisQuestionId =
  | "irritacao_hoje"
  | "alergias"
  | "reacao_extensao"
  | "olhos_sensiveis"
  | "lentes_contato"
  | "doenca_ocular"
  | "cirurgia_ocular"
  | "gestante_lactante";

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
    id: "irritacao_hoje",
    label: "Está com alguma irritação ou sensibilidade hoje?",
    detailPlaceholder: "O que está sentindo?",
    flag: "IRRITACAO_OCULAR",
  },
  {
    id: "alergias",
    label: "Você tem alguma alergia?",
    detailPlaceholder: "Qual? (cosméticos, cola, medicamentos...)",
    // Sem flag automática: só o checkbox de cianoacrilato contraindica.
  },
  {
    id: "reacao_extensao",
    label: "Já teve reação a extensão ou cola?",
    detailPlaceholder: "O que aconteceu?",
    flag: "REACAO_EXTENSAO",
  },
  {
    id: "olhos_sensiveis",
    label: "Olhos sensíveis ou lacrimejamento?",
    detailPlaceholder: "Conte como costuma ser.",
  },
  {
    id: "lentes_contato",
    label: "Usa lentes de contato?",
    hint: "Retirar as lentes antes da aplicação.",
    detailPlaceholder: "Com que frequência?",
  },
  {
    id: "doenca_ocular",
    label: "Possui alguma doença ocular?",
    detailPlaceholder: "Qual? (glaucoma, blefarite, conjuntivite...)",
    flag: "DOENCA_OCULAR",
  },
  {
    id: "cirurgia_ocular",
    label: "Já fez procedimento ocular (6m)?",
    hint: "Cirurgia ou procedimento nos olhos nos últimos 6 meses.",
    detailPlaceholder: "Qual procedimento e quando?",
    flag: "CIRURGIA_OCULAR_6M",
  },
  {
    id: "gestante_lactante",
    label: "Está gestante ou amamentando?",
    detailPlaceholder: "Semanas de gestação, liberação médica...",
    flag: "GESTANTE_LACTANTE",
  },
];

export type AnamnesisAnswer = { sim: boolean; detalhe: string };

export type ParsedAnamnesis = {
  respostas: Partial<Record<AnamnesisQuestionId, AnamnesisAnswer>>;
  alergiaCianoacrilato: boolean;
};

/** Parse defensivo de AnamnesisForm.answersJson. */
export function parseAnamnesisAnswers(json: string | null | undefined): ParsedAnamnesis {
  const empty: ParsedAnamnesis = { respostas: {}, alergiaCianoacrilato: false };
  if (!json) return empty;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return empty;
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
