/**
 * Equipe — tipos e regras puras (servem em client e server components).
 * Em todo o app, memberId nulo = a dona do estúdio.
 */

/** Chave da dona em URLs e estados (?prof=dona). */
export const OWNER_KEY = "dona";
/** Chave de "todas as profissionais" (?prof=todas). */
export const ALL_KEY = "todas";

/** Cor da dona na agenda (berinjela do app). */
export const OWNER_COLOR = "#2a2240";
/** Cores da equipe: sóbrias e com contraste AA para iniciais brancas. */
export const TEAM_COLORS = ["#6f5fa8", "#2f7d6d", "#a2552f", "#3f6fb5", "#a6497a", "#6b6230"];

export type TeamPro = {
  /** Chave estável para URL/estado: OWNER_KEY ou o id da funcionária. */
  key: string;
  memberId: string | null;
  name: string;
  color: string;
  isOwner: boolean;
  /** Aparece para a cliente escolher no link público. */
  bookableOnline: boolean;
  /** % de comissão atual (0 para a dona). */
  commissionPct: number;
};

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** Nome curto para mostrar: "Você" para quem está logada, primeiro nome para as outras. */
export function proLabel(pro: Pick<TeamPro, "memberId" | "name">, viewerMemberId: string | null): string {
  return pro.memberId === viewerMemberId ? "Você" : firstName(pro.name);
}

export function proByKey(team: TeamPro[], key: string | null | undefined): TeamPro | undefined {
  if (!key) return undefined;
  return team.find((p) => p.key === key);
}

export function proForMember(team: TeamPro[], memberId: string | null): TeamPro | undefined {
  return team.find((p) => p.memberId === memberId);
}

/** Filtro de profissional vindo da URL (?prof=). Valor desconhecido = todas. */
export type ProFilter = { all: true } | { all: false; pro: TeamPro };

export function parseProFilter(raw: string | null | undefined, team: TeamPro[]): ProFilter {
  if (!raw || raw === ALL_KEY) return { all: true };
  const pro = proByKey(team, raw);
  return pro ? { all: false, pro } : { all: true };
}
