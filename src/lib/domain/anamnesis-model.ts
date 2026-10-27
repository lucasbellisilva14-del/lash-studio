/**
 * Anamnese personalizável: modelo de perguntas, respostas e contraindicações.
 *
 * - O modelo da profissional fica em `Professional.anamnesisQuestionsJson`
 *   (nulo = modelo padrão do LashOS, definido aqui).
 * - Cada anamnese guarda o retrato das perguntas do dia em
 *   `AnamnesisForm.questionsSnapshotJson` (nulo = respondida antes da
 *   personalização; lê-se com o modelo padrão, que usa os MESMOS ids do
 *   formulário antigo, então as respostas antigas continuam batendo).
 * - Flags de contraindicação (`AnamnesisForm.contraindicationFlags`): as
 *   perguntas antigas que geravam flag continuam gerando a MESMA chave
 *   (`LEGACY_FLAGS`). As outras perguntas com alerta gravam como flag o texto
 *   da pergunta como foi feita no dia, então o rótulo sai certo em qualquer
 *   tela, mesmo sem o retrato (ver `contraindicationLabel` em
 *   `@/components/clientes/contraindications`).
 *
 * Módulo puro (sem banco). Usa zod: em componentes client, importe só os
 * tipos (`import type`) para o zod não ir para o navegador.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export const ANAMNESIS_QUESTION_TYPES = ["SIM_NAO", "TEXTO_CURTO", "TEXTO_LONGO", "ESCOLHA"] as const;
export type AnamnesisQuestionType = (typeof ANAMNESIS_QUESTION_TYPES)[number];

export type AnamnesisQuestion = {
  id: string;
  text: string;
  type: AnamnesisQuestionType;
  /** Só ESCOLHA: a cliente escolhe uma destas opções. */
  options?: string[];
  /** Só SIM_NAO: pergunta extra feita quando a resposta é "sim". */
  followUp?: string;
  required: boolean;
  /** Só SIM_NAO: resposta "sim" vira alerta de contraindicação. */
  alert: boolean;
};

/** Resposta gravada, no formato do tipo da pergunta. */
export type AnamnesisAnswer =
  | { sim: boolean; detalhe: string }
  | { texto: string }
  | { opcao: string };

/** Respostas por id de pergunta. */
export type AnamnesisAnswers = Record<string, AnamnesisAnswer>;

/** Resposta gravada que não bate com nenhuma pergunta do modelo (formatos antigos). */
export type AnamnesisExtraAnswer = { label: string; value: string };

export const ANAMNESIS_LIMITS = {
  maxQuestions: 40,
  questionText: 200,
  followUp: 200,
  option: 60,
  maxOptions: 12,
  /** Detalhe do "se sim". */
  detail: 600,
  shortAnswer: 200,
  longAnswer: 1000,
} as const;

export type AnamnesisLimits = typeof ANAMNESIS_LIMITS;

/** Id de pergunta: minúsculas, números e "_", começando por letra. */
const ID_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
/** Nomes que colidem com propriedades de objeto do JavaScript. */
const RESERVED_IDS = new Set(["constructor"]);

/** Pergunta do modelo antigo que virou pergunta própria (era um checkbox dentro de "alergias"). */
const CIANO_ID = "alergia_cianoacrilato";
const CIANO_FLAG = "ALERGIA_CIANOACRILATO";

/**
 * Perguntas do modelo antigo que geram flags fixas. Enquanto o id existir no
 * modelo (e a pergunta tiver alerta), o "sim" grava esta chave, com o rótulo
 * de sempre em contraindications.ts.
 */
export const LEGACY_FLAGS: ReadonlyMap<string, string> = new Map([
  ["irritacao_hoje", "IRRITACAO_OCULAR"],
  ["reacao_extensao", "REACAO_EXTENSAO"],
  ["doenca_ocular", "DOENCA_OCULAR"],
  ["cirurgia_ocular", "CIRURGIA_OCULAR_6M"],
  ["gestante_lactante", "GESTANTE_LACTANTE"],
  [CIANO_ID, CIANO_FLAG],
]);

/* ------------------------------------------------------------------ */
/* Modelo padrão                                                       */
/* ------------------------------------------------------------------ */

/**
 * Convertido do formulário antigo com os MESMOS ids. Únicas mudanças: a dica
 * da cirurgia entrou no texto da pergunta, a dica das lentes entrou no "se
 * sim" e o checkbox "Alergia a cianoacrilato" virou pergunta própria.
 */
const DEFAULT_MODEL: readonly AnamnesisQuestion[] = [
  {
    id: "irritacao_hoje",
    text: "Está com alguma irritação ou sensibilidade hoje?",
    type: "SIM_NAO",
    followUp: "O que está sentindo?",
    required: true,
    alert: true,
  },
  {
    id: "alergias",
    text: "Você tem alguma alergia?",
    type: "SIM_NAO",
    followUp: "Qual? (cosméticos, cola, medicamentos...)",
    required: true,
    alert: false,
  },
  {
    id: CIANO_ID,
    text: "Tem alergia a cianoacrilato, o componente da cola?",
    type: "SIM_NAO",
    required: true,
    alert: true,
  },
  {
    id: "reacao_extensao",
    text: "Já teve reação a extensão ou cola?",
    type: "SIM_NAO",
    followUp: "O que aconteceu?",
    required: true,
    alert: true,
  },
  {
    id: "olhos_sensiveis",
    text: "Olhos sensíveis ou lacrimejamento?",
    type: "SIM_NAO",
    followUp: "Conte como costuma ser.",
    required: true,
    alert: false,
  },
  {
    id: "lentes_contato",
    text: "Usa lentes de contato?",
    type: "SIM_NAO",
    followUp: "Com que frequência? (retirar as lentes antes da aplicação)",
    required: true,
    alert: false,
  },
  {
    id: "doenca_ocular",
    text: "Possui alguma doença ocular?",
    type: "SIM_NAO",
    followUp: "Qual? (glaucoma, blefarite, conjuntivite...)",
    required: true,
    alert: true,
  },
  {
    id: "cirurgia_ocular",
    text: "Fez cirurgia ou procedimento nos olhos nos últimos 6 meses?",
    type: "SIM_NAO",
    followUp: "Qual procedimento e quando?",
    required: true,
    alert: true,
  },
  {
    id: "gestante_lactante",
    text: "Está gestante ou amamentando?",
    type: "SIM_NAO",
    followUp: "Semanas de gestação, liberação médica...",
    required: true,
    alert: true,
  },
];

/** Cópia nova do modelo padrão (quem recebe pode mexer à vontade). */
export function getDefaultAnamnesisModel(): AnamnesisQuestion[] {
  return DEFAULT_MODEL.map(canonicalQuestion);
}

/* ------------------------------------------------------------------ */
/* Leitura do JSON gravado (modelo da profissional ou retrato do dia)  */
/* ------------------------------------------------------------------ */

/**
 * Leitura tolerante: sem limites de tamanho (um retrato antigo nunca deixa
 * de abrir por causa de uma regra nova) e item com defeito é descartado sem
 * derrubar os outros.
 */
const storedQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(ANAMNESIS_QUESTION_TYPES),
  options: z.array(z.string()).optional().catch(undefined),
  followUp: z.string().optional().catch(undefined),
  required: z.boolean().catch(false),
  alert: z.boolean().catch(false),
});

/** Perguntas de um JSON gravado; nulo quando vazio ou ilegível. */
export function parseAnamnesisQuestions(
  json: string | null | undefined,
): AnamnesisQuestion[] | null {
  const list = questionList(safeJson(json));
  if (!list) return null;

  const out: AnamnesisQuestion[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const parsed = storedQuestionSchema.safeParse(item);
    if (!parsed.success) continue;
    const { id, type, required, alert } = parsed.data;
    const text = cleanLine(parsed.data.text);
    if (!isValidId(id) || seen.has(id) || !text) continue;

    const question: AnamnesisQuestion = { id, text, type, required, alert };
    if (type === "SIM_NAO" && parsed.data.followUp) {
      question.followUp = cleanLine(parsed.data.followUp);
    }
    if (type === "ESCOLHA") {
      const options = normalizeOptions(parsed.data.options);
      if (options.length > 0) question.options = options;
      // Escolha sem nenhuma opção não teria como ser respondida.
      else question.type = "TEXTO_CURTO";
    }
    seen.add(id);
    out.push(canonicalQuestion(question));
  }
  return out.length > 0 ? out : null;
}

/** Perguntas do JSON gravado ou, sem ele, o modelo padrão. */
export function anamnesisQuestionsOrDefault(json: string | null | undefined): AnamnesisQuestion[] {
  return parseAnamnesisQuestions(json) ?? getDefaultAnamnesisModel();
}

/** JSON para Professional.anamnesisQuestionsJson e AnamnesisForm.questionsSnapshotJson. */
export function serializeAnamnesisQuestions(questions: readonly AnamnesisQuestion[]): string {
  return JSON.stringify({ versao: 1, perguntas: questions.map(canonicalQuestion) });
}

/** O modelo é exatamente o padrão do LashOS (para gravar nulo e seguir o padrão). */
export function isDefaultAnamnesisModel(questions: readonly AnamnesisQuestion[]): boolean {
  return serializeAnamnesisQuestions(questions) === serializeAnamnesisQuestions(DEFAULT_MODEL);
}

/* ------------------------------------------------------------------ */
/* Validação do modelo editado em /config/anamnese                     */
/* ------------------------------------------------------------------ */

export type AnamnesisModelValidation =
  | { ok: true; questions: AnamnesisQuestion[] }
  | {
      ok: false;
      error: string;
      /** Erro por pergunta (chave = id enviado, ou a posição quando não veio id). */
      questionErrors: Record<string, string>;
    };

/**
 * Valida e normaliza o modelo vindo do editor: textos limpos, opções sem
 * repetição, campos só onde o tipo usa e ids válidos e únicos (id ausente,
 * inválido ou repetido ganha um novo, gerado aqui).
 */
export function validateAnamnesisModel(input: unknown): AnamnesisModelValidation {
  const L = ANAMNESIS_LIMITS;
  const list = questionList(input);
  if (!list) {
    return {
      ok: false,
      error: "Não foi possível ler as perguntas. Recarregue a página e tente de novo.",
      questionErrors: {},
    };
  }
  if (list.length === 0) {
    return { ok: false, error: "Deixe pelo menos uma pergunta no modelo.", questionErrors: {} };
  }
  if (list.length > L.maxQuestions) {
    return {
      ok: false,
      error: `O modelo pode ter até ${L.maxQuestions} perguntas.`,
      questionErrors: {},
    };
  }

  const questions: AnamnesisQuestion[] = [];
  const questionErrors: Record<string, string> = {};
  const usedIds = new Set<string>();

  list.forEach((item, index) => {
    const raw: Record<string, unknown> = isRecord(item) ? item : {};
    const sentId = typeof raw.id === "string" ? raw.id : "";
    const errorKey = sentId || String(index);
    const id = isValidId(sentId) && !usedIds.has(sentId) ? sentId : generateQuestionId(usedIds);
    usedIds.add(id);

    const text = typeof raw.text === "string" ? cleanLine(raw.text) : "";
    const type = isQuestionType(raw.type) ? raw.type : null;
    let error: string | null = null;

    if (!text) error = "Escreva a pergunta.";
    else if (text.length > L.questionText) {
      error = `A pergunta passou de ${L.questionText} caracteres.`;
    } else if (!type) error = "Escolha o tipo de resposta.";

    const question: AnamnesisQuestion = {
      id,
      text,
      type: type ?? "SIM_NAO",
      required: raw.required === true,
      alert: type === "SIM_NAO" && raw.alert === true,
    };

    if (type === "SIM_NAO" && typeof raw.followUp === "string") {
      const followUp = cleanLine(raw.followUp);
      if (followUp.length > L.followUp) {
        error ??= `O "se sim, perguntar" passou de ${L.followUp} caracteres.`;
      } else if (followUp) {
        question.followUp = followUp;
      }
    }

    if (type === "ESCOLHA") {
      const options = normalizeOptions(raw.options);
      if (options.length < 2) {
        error ??= "Escreva pelo menos duas opções, separadas por vírgula.";
      } else if (options.length > L.maxOptions) {
        error ??= `Use no máximo ${L.maxOptions} opções.`;
      } else if (options.some((option) => option.length > L.option)) {
        error ??= `Cada opção pode ter até ${L.option} caracteres.`;
      }
      question.options = options;
    }

    if (error) questionErrors[errorKey] = error;
    questions.push(canonicalQuestion(question));
  });

  if (Object.keys(questionErrors).length > 0) {
    return { ok: false, error: "Revise as perguntas destacadas.", questionErrors };
  }
  return { ok: true, questions };
}

/** Id novo e estável para uma pergunta ("p_" + tempo + sorteio). */
export function generateQuestionId(used: ReadonlySet<string> = new Set()): string {
  for (;;) {
    const id = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    if (!used.has(id)) return id;
  }
}

/* ------------------------------------------------------------------ */
/* Respostas                                                           */
/* ------------------------------------------------------------------ */

/** Chaves de controle do answersJson (não são respostas). */
const ANSWER_META_KEYS = new Set(["versao", "respostas", "alergiaCianoacrilato"]);

/**
 * Lê AnamnesisForm.answersJson no formato das perguntas dadas. Aceita:
 * - v2: `{ versao: 2, respostas: { id: { pergunta, sim|texto|opcao } } }`;
 * - v1 (formulário fixo): `{ versao: 1, respostas: { id: { sim, detalhe } }, alergiaCianoacrilato }`;
 * - chaves soltas na raiz (formato mais antigo): vão para `extras`.
 * O que não bate com nenhuma pergunta vai para `extras`, para nada sumir da tela.
 */
export function readAnamnesisAnswers(
  answersJson: string | null | undefined,
  questions: readonly AnamnesisQuestion[],
  storedFlags: readonly string[] = [],
): { answers: AnamnesisAnswers; extras: AnamnesisExtraAnswer[] } {
  const root = safeJson(answersJson);
  const rootRecord = isRecord(root) ? root : {};
  const structured = isRecord(rootRecord.respostas) ? rootRecord.respostas : null;
  const version =
    typeof rootRecord.versao === "number" ? rootRecord.versao : structured ? 1 : 0;

  // Map: chaves vindas do JSON não mexem em protótipo de objeto nenhum.
  const source = new Map<string, unknown>();
  for (const [key, value] of Object.entries(structured ?? rootRecord)) {
    if (!structured && ANSWER_META_KEYS.has(key)) continue;
    source.set(key, value);
  }

  const answers: AnamnesisAnswers = {};
  const used = new Set<string>();
  for (const question of questions) {
    if (!source.has(question.id)) continue;
    const answer = normalizeAnswer(question, source.get(question.id));
    if (answer) {
      answers[question.id] = answer;
      used.add(question.id);
    }
  }

  // No formulário antigo, alergia a cianoacrilato era um checkbox dentro de
  // "alergias" (gravado na raiz e nas flags): vira a resposta da pergunta própria.
  const ciano = questions.find((q) => q.id === CIANO_ID && q.type === "SIM_NAO");
  if (ciano && !answers[CIANO_ID] && version < 2) {
    const marked = rootRecord.alergiaCianoacrilato === true || storedFlags.includes(CIANO_FLAG);
    if (marked) answers[CIANO_ID] = { sim: true, detalhe: "" };
    else if (version === 1) answers[CIANO_ID] = { sim: false, detalhe: "" };
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const extras: AnamnesisExtraAnswer[] = [];
  for (const [key, raw] of source) {
    if (used.has(key)) continue;
    const value = describeLooseAnswer(raw);
    if (!value) continue;
    const label =
      byId.get(key)?.text ??
      (isRecord(raw) && typeof raw.pergunta === "string" && raw.pergunta.trim()
        ? raw.pergunta.trim()
        : humanizeKey(key));
    extras.push({ label, value });
  }

  return { answers, extras };
}

/** A pergunta tem resposta válida (para "Obrigatória"). */
export function isAnswered(question: AnamnesisQuestion, answer: AnamnesisAnswer | undefined): boolean {
  if (!answer) return false;
  switch (question.type) {
    case "SIM_NAO":
      return "sim" in answer;
    case "ESCOLHA":
      return "opcao" in answer && (question.options ?? []).includes(answer.opcao);
    default:
      return "texto" in answer && answer.texto.trim() !== "";
  }
}

/**
 * JSON para AnamnesisForm.answersJson (v2). Cada resposta leva o texto da
 * pergunta, então o registro se explica sozinho (exportação LGPD, leitura sem
 * o retrato). `alergiaCianoacrilato` fica na raiz como no v1.
 */
export function serializeAnamnesisAnswers(
  questions: readonly AnamnesisQuestion[],
  answers: AnamnesisAnswers,
): string {
  const respostas: Record<string, unknown> = {};
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer || !isAnswered(question, answer)) continue;
    respostas[question.id] = { pergunta: question.text, ...answer };
  }
  const ciano = answers[CIANO_ID];
  return JSON.stringify({
    versao: 2,
    respostas,
    alergiaCianoacrilato: Boolean(ciano && "sim" in ciano && ciano.sim),
  });
}

/* ------------------------------------------------------------------ */
/* Contraindicações                                                    */
/* ------------------------------------------------------------------ */

/**
 * Flag gravada quando a pergunta com alerta recebe "sim": a chave antiga
 * para os ids do formulário fixo, ou o texto da pergunta como foi feita.
 */
export function contraindicationFlagFor(question: AnamnesisQuestion): string {
  return LEGACY_FLAGS.get(question.id) ?? question.text.trim();
}

/** Flags e hasContraindication a partir das perguntas com alerta respondidas "sim". */
export function computeContraindications(
  questions: readonly AnamnesisQuestion[],
  answers: AnamnesisAnswers,
): { flags: string[]; hasContraindication: boolean } {
  const flags: string[] = [];
  for (const question of questions) {
    if (question.type !== "SIM_NAO" || !question.alert) continue;
    const answer = answers[question.id];
    if (!answer || !("sim" in answer) || !answer.sim) continue;
    const flag = contraindicationFlagFor(question);
    if (flag && !flags.includes(flag)) flags.push(flag);
  }
  return { flags, hasContraindication: flags.length > 0 };
}

/* ------------------------------------------------------------------ */
/* Apoio                                                               */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(json: string | null | undefined): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Aceita a lista pura ou `{ versao, perguntas: [...] }`. */
function questionList(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.perguntas)) return data.perguntas;
  return null;
}

function isValidId(id: string): boolean {
  return ID_PATTERN.test(id) && !RESERVED_IDS.has(id);
}

function isQuestionType(value: unknown): value is AnamnesisQuestionType {
  return (
    typeof value === "string" && (ANAMNESIS_QUESTION_TYPES as readonly string[]).includes(value)
  );
}

/** Uma linha: espaços e quebras viram um espaço só. */
function cleanLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Lista ou texto separado por vírgula → opções limpas, sem repetir. */
function normalizeOptions(raw: unknown): string[] {
  const parts = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const option = cleanLine(part);
    const key = option.toLocaleLowerCase("pt-BR");
    if (!option || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

/** Mesma pergunta, chaves em ordem fixa e só os campos que o tipo usa. */
function canonicalQuestion(question: AnamnesisQuestion): AnamnesisQuestion {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    ...(question.type === "SIM_NAO" && question.followUp ? { followUp: question.followUp } : {}),
    ...(question.type === "ESCOLHA" ? { options: [...(question.options ?? [])] } : {}),
    required: question.required,
    alert: question.type === "SIM_NAO" && question.alert,
  };
}

/** Resposta gravada → formato do tipo da pergunta (nulo se não servir). */
function normalizeAnswer(question: AnamnesisQuestion, raw: unknown): AnamnesisAnswer | null {
  const record = isRecord(raw) ? raw : null;
  switch (question.type) {
    case "SIM_NAO": {
      const sim =
        typeof record?.sim === "boolean"
          ? record.sim
          : typeof raw === "boolean"
            ? raw
            : raw === "sim"
              ? true
              : raw === "nao"
                ? false
                : null;
      if (sim === null) return null;
      const detalhe = typeof record?.detalhe === "string" ? record.detalhe : "";
      return { sim, detalhe };
    }
    case "ESCOLHA": {
      const opcao =
        typeof record?.opcao === "string" ? record.opcao : typeof raw === "string" ? raw : "";
      return opcao.trim() ? { opcao: opcao.trim() } : null;
    }
    default: {
      const texto =
        typeof record?.texto === "string" ? record.texto : typeof raw === "string" ? raw : "";
      return texto.trim() ? { texto: texto.trim() } : null;
    }
  }
}

/** Texto legível de uma resposta solta, de qualquer formato. */
function describeLooseAnswer(raw: unknown): string | null {
  if (typeof raw === "boolean") return raw ? "Sim" : "Não";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw.trim() || null;
  if (!isRecord(raw)) return null;
  if (typeof raw.sim === "boolean") {
    const detalhe = typeof raw.detalhe === "string" ? raw.detalhe.trim() : "";
    return `${raw.sim ? "Sim" : "Não"}${raw.sim && detalhe ? ` — ${detalhe}` : ""}`;
  }
  if (typeof raw.texto === "string") return raw.texto.trim() || null;
  if (typeof raw.opcao === "string") return raw.opcao.trim() || null;
  return null;
}

/** "glaucomaOuColirio" / "lentes_contato" → "Glaucoma ou colirio" / "Lentes contato". */
function humanizeKey(key: string): string {
  const text = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}
