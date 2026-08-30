/** Vocabulário de domínio + labels pt-BR. Valores persistidos são as chaves. */

export const SERVICE_CATEGORIES = {
  APLICACAO: "Aplicação",
  MANUTENCAO: "Manutenção",
  REMOCAO: "Remoção",
  LASH_LIFTING: "Lash lifting",
  BROW_LAMINATION: "Brow lamination",
  DESIGN_SOBRANCELHA: "Design de sobrancelha",
  OUTRO: "Outro",
} as const;
export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;

export const APPOINTMENT_STATUSES = {
  PRE_AGENDADO: "Pré-agendado",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  FALTOU: "Faltou",
  CANCELADO: "Cancelado",
  CANCELADO_TARDE: "Cancelamento tardio",
} as const;
export type AppointmentStatus = keyof typeof APPOINTMENT_STATUSES;

/** Status que ocupam horário na agenda (contam p/ conflito). */
export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "PRE_AGENDADO",
  "CONFIRMADO",
  "CONCLUIDO",
];

/** Atendimentos que renovam o ciclo de cílios da cliente. */
export const LASH_CYCLE_CATEGORIES: ServiceCategory[] = ["APLICACAO", "MANUTENCAO"];

export const CLIENT_STATUSES = {
  ATIVA: "Ativa",
  EM_RISCO: "Em risco",
  INATIVA: "Inativa",
  SEM_HISTORICO: "Sem histórico",
} as const;
export type ClientStatus = keyof typeof CLIENT_STATUSES;

export const CLIENT_SOURCES = {
  INSTAGRAM: "Instagram",
  INDICACAO: "Indicação",
  GOOGLE: "Google",
  PASSOU_NA_FRENTE: "Passou na frente",
  OUTRO: "Outro",
} as const;
export type ClientSource = keyof typeof CLIENT_SOURCES;

export const TECHNIQUES = {
  CLASSICO: "Clássico fio a fio",
  HIBRIDO: "Híbrido",
  VOLUME_BRASILEIRO: "Volume brasileiro",
  VOLUME_RUSSO: "Volume russo",
  MEGA_VOLUME: "Mega volume",
  FOX_EYES: "Fox eyes",
  LASH_LIFTING: "Lash lifting",
} as const;
export type Technique = keyof typeof TECHNIQUES;

export const VOLUME_FACTORS = ["2D", "3D", "4D", "5D", "6D", "7D", "8D"] as const;

export const CURVATURES = ["J", "B", "C", "CC", "D", "DD", "L", "LC", "LD", "M"] as const;

export const THICKNESSES = ["0.03", "0.05", "0.07", "0.10", "0.15", "0.20"] as const;

/** Mapping: 5 zonas do olho, canto interno → externo; tamanhos 6–15mm. */
export const MAPPING_ZONES = 5;
export const MAPPING_MIN_MM = 6;
export const MAPPING_MAX_MM = 15;
export type Mapping = { zones: number[] };

export function parseMapping(json: string | null | undefined): Mapping | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed?.zones) && parsed.zones.length === MAPPING_ZONES) {
      return { zones: parsed.zones.map(Number) };
    }
    return null;
  } catch {
    return null;
  }
}

export const PAYMENT_METHODS = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO_VISTA: "Crédito à vista",
  CREDITO_PARCELADO: "Crédito parcelado",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const EXPENSE_CATEGORIES = {
  MATERIAL: "Material",
  ALUGUEL: "Aluguel",
  MARKETING: "Marketing",
  CURSOS: "Cursos",
  OUTROS: "Outros",
} as const;

export const TEMPLATE_KINDS = {
  CONFIRMACAO: "Confirmação de agendamento",
  LEMBRETE_24H: "Lembrete 24h antes",
  POS_APLICACAO: "Cuidados pós-aplicação",
  MANUTENCAO: "Aviso de manutenção",
  ANIVERSARIO: "Feliz aniversário",
  RESGATE_45: "Resgate — 45 dias",
  RESGATE_60: "Resgate — 60 dias",
  RESGATE_90: "Resgate — 90 dias",
} as const;
export type TemplateKind = keyof typeof TEMPLATE_KINDS;

export const NATURAL_LASH_CONDITIONS = {
  FORTES: "Fortes",
  MEDIOS: "Médios",
  FRAGEIS: "Frágeis",
  FALHADOS: "Falhados",
} as const;

export const PRODUCT_CATEGORIES = {
  FIOS: "Fios",
  COLA: "Cola",
  PADS: "Pads",
  PRIMER: "Primer",
  REMOVEDOR: "Removedor",
  MICROPINCEIS: "Micropincéis",
  FITA: "Fita",
  OUTRO: "Outro",
} as const;

export const WEEKDAYS_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const WEEKDAYS_PT_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
