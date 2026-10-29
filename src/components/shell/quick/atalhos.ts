/**
 * Atalhos de "Criar" — a mesma lista alimenta o painel lateral do PC e o
 * menu do "+" no celular. Despesa é da dona.
 */
import {
  IconCalendarAdd,
  IconCalendarX,
  IconChat,
  IconMoney,
  IconUserAdd,
} from "@/components/ui/icons";

export type Atalho = {
  href: string;
  label: string;
  icon: typeof IconCalendarAdd;
  /** Só a dona vê. */
  soDona?: boolean;
};

export const ATALHOS_CRIAR: readonly Atalho[] = [
  { href: "/agenda?novo=1", label: "Agendar horário", icon: IconCalendarAdd },
  { href: "/clientes?nova=1", label: "Nova cliente", icon: IconUserAdd },
  { href: "/mensagens", label: "Mensagem avulsa", icon: IconChat },
  { href: "/agenda/bloqueios", label: "Bloquear horário", icon: IconCalendarX },
  { href: "/financeiro?despesa=1", label: "Nova despesa", icon: IconMoney, soDona: true },
];

export function atalhosCriar(isOwner: boolean): Atalho[] {
  return ATALHOS_CRIAR.filter((atalho) => isOwner || !atalho.soDona);
}

/** Monta o caminho do link público: o estúdio para a dona; já com a profissional para a funcionária. */
export function linkPublico(
  slug: string,
  viewer: { isOwner: boolean; memberId: string | null },
  atendePeloLink: boolean,
): string | null {
  if (viewer.isOwner) return `/agendar/${slug}`;
  if (atendePeloLink && viewer.memberId) {
    return `/agendar/${slug}?com=${encodeURIComponent(viewer.memberId)}`;
  }
  return null;
}
