/**
 * Equipe — dados que as telas de /config/equipe recebem do servidor.
 * Nunca carregam senha nem tokens: o link do convite só existe na resposta
 * da ação que o gerou (o banco guarda só o hash).
 */

export type MemberItem = {
  id: string;
  name: string;
  email: string;
  color: string;
  commissionPct: number;
  bookableOnline: boolean;
  active: boolean;
  /** Ainda não criou a senha (convite em aberto ou vencido). */
  pending: boolean;
  /** Só para pendentes: "Vale até 03/11/2026" ou "Venceu em 03/11/2026". */
  inviteLabel: string | null;
  inviteExpired: boolean;
  /** Horários marcados daqui para frente (aviso ao desativar). */
  futureCount: number;
};

export type OwnerItem = {
  name: string;
  email: string;
  ownerBookable: boolean;
};

/** Convite recém-gerado: aparece uma vez, no painel do convite. */
export type InviteInfo = {
  url: string;
  firstName: string;
  studioName: string;
  /** O e-mail saiu de verdade (provedor real, sem erro). */
  emailSent: boolean;
};

/** Nome de cada cor da equipe (rótulo acessível das bolinhas). */
export const TEAM_COLOR_NAMES: Record<string, string> = {
  "#6f5fa8": "Lavanda",
  "#2f7d6d": "Verde",
  "#a2552f": "Terracota",
  "#3f6fb5": "Azul",
  "#a6497a": "Ameixa",
  "#6b6230": "Oliva",
};
