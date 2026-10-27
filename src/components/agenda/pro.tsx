/**
 * Equipe na agenda: avatar da profissional, rótulos curtos e links que
 * preservam o filtro ?prof=. Sem "use client": serve em server e client
 * components (só apresentação e funções puras).
 */
import { cn } from "@/lib/cn";
import { firstName, initials, type TeamPro } from "@/lib/team-shared";
import type { AgendaPro, AgendaQuemAtende, VisaoAgenda } from "./types";

/** Valor de "Para quem" de um bloqueio que vale para o estúdio inteiro. */
export const ESTUDIO_KEY = "estudio";

/** URL da agenda mantendo a visão, o dia e o filtro de profissional. */
export function agendaHref(visao: VisaoAgenda, dia: string, prof: string | null): string {
  const params = new URLSearchParams({ visao, dia });
  if (prof) params.set("prof", prof);
  return `/agenda?${params.toString()}`;
}

/**
 * Rótulos curtos e únicos da equipe: "Você" para quem está logada, primeiro
 * nome para as outras e, se dois primeiros nomes se repetem, a inicial do
 * sobrenome ("Ana P." e "Ana C.").
 */
export function rotulosDaEquipe(team: TeamPro[], viewerMemberId: string | null): Map<string, string> {
  const contagem = new Map<string, number>();
  for (const p of team) {
    if (p.memberId === viewerMemberId) continue;
    const k = firstName(p.name).toLocaleLowerCase("pt-BR");
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  const rotulos = new Map<string, string>();
  for (const p of team) {
    if (p.memberId === viewerMemberId) {
      rotulos.set(p.key, "Você");
      continue;
    }
    const primeiro = firstName(p.name);
    const repetido = (contagem.get(primeiro.toLocaleLowerCase("pt-BR")) ?? 0) > 1;
    const partes = p.name.trim().split(/\s+/);
    rotulos.set(
      p.key,
      repetido && partes.length > 1 ? `${primeiro} ${partes[partes.length - 1][0].toUpperCase()}.` : primeiro,
    );
  }
  return rotulos;
}

/** A equipe no formato da tela (sem comissão nem outros dados internos). */
export function toAgendaPros(team: TeamPro[], viewerMemberId: string | null): AgendaPro[] {
  const rotulos = rotulosDaEquipe(team, viewerMemberId);
  return team.map((p) => ({
    key: p.key,
    memberId: p.memberId,
    nome: p.name,
    cor: p.color,
    rotulo: rotulos.get(p.key) ?? firstName(p.name),
  }));
}

/** Rótulo de quem atende: o da equipe na tela ou, se ela saiu da equipe, o primeiro nome. */
export function rotuloQuemAtende(
  pro: AgendaQuemAtende,
  equipe: AgendaPro[],
  viewerMemberId: string | null,
): string {
  if (pro.memberId === viewerMemberId) return "Você";
  return equipe.find((p) => p.key === pro.key)?.rotulo ?? firstName(pro.nome);
}

/** Iniciais da profissional num círculo da cor dela (as cores da equipe são dados). */
export function ProAvatar({
  nome,
  cor,
  size = 20,
  className,
  title,
}: {
  nome: string;
  cor: string;
  size?: number;
  className?: string;
  /** Texto acessível; sem ele o avatar é decorativo. */
  title?: string;
}) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none tracking-[-0.02em] text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: cor,
        fontSize: Math.max(8.5, Math.round(size * 0.45 * 2) / 2),
      }}
    >
      {initials(nome)}
    </span>
  );
}

/** Bolinha da cor da profissional (filtros e listas). */
export function ProDot({ cor, className }: { cor: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ background: cor }}
    />
  );
}
