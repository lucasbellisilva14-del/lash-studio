"use client";

/**
 * Config → Equipe: a dona no topo (com o "também atendo pelo link"), a lista
 * da equipe e o sheet de adicionar/editar com o convite.
 */
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronRight, IconInfo, IconTeam, IconUserAdd, IconX } from "@/components/ui/icons";
import { SavedToast } from "@/components/config/feedback";
import { OWNER_COLOR } from "@/lib/team-shared";
import { salvarDonaAtendeAction } from "@/app/(app)/config/equipe/actions";
import { MemberAvatar } from "./member-avatar";
import { MemberFormSheet } from "./member-form-sheet";
import { SwitchField } from "./switch";
import type { MemberItem, OwnerItem } from "./types";

type SheetState = { kind: "new" } | { kind: "edit"; id: string } | null;

export function EquipeManager({ owner, members }: { owner: OwnerItem; members: MemberItem[] }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<{ at: number; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ativas = members.filter((m) => m.active);
  const desativadas = members.filter((m) => !m.active);
  const ordenadas = [...ativas, ...desativadas];
  const usedColors = ativas.map((m) => m.color.toLowerCase());
  const alguemNoLink = ativas.some((m) => m.bookableOnline);
  const editando = sheet?.kind === "edit" ? (members.find((m) => m.id === sheet.id) ?? null) : null;

  const fechar = useCallback(() => setSheet(null), []);
  const concluir = useCallback((message: string, aviso?: string) => {
    setSheet(null);
    setToast({ at: Date.now(), message });
    setNotice(aviso ?? null);
  }, []);
  const abrirNova = () => {
    setNotice(null);
    setSheet({ kind: "new" });
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[18px] bg-surface px-4 py-3.5 text-[13.5px] leading-snug text-ink shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]"
        >
          <IconInfo width={18} height={18} className="mt-px shrink-0 text-ink-soft" />
          <p className="grow">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Fechar aviso"
            className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink"
          >
            <IconX width={15} height={15} />
          </button>
        </div>
      ) : null}

      <OwnerCard owner={owner} alguemNoLink={alguemNoLink} temEquipe={ativas.length > 0} />

      {members.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconTeam />}
            title="Só você por aqui"
            description="Adicione quem atende com você: cada uma entra com o próprio login e vê só a agenda e os números dela."
            action={
              <Button onClick={abrirNova}>
                <IconUserAdd width={18} height={18} />
                Adicionar profissional
              </Button>
            }
          />
        </Card>
      ) : (
        <section>
          <Card className="overflow-hidden">
            <CardHeader
              title="Sua equipe"
              description={
                (ativas.length === 1 ? "1 profissional" : `${ativas.length} profissionais`) +
                (desativadas.length > 0
                  ? ` · ${desativadas.length} ${desativadas.length === 1 ? "desativada" : "desativadas"}`
                  : "")
              }
            />
            <ul className="divide-y divide-line">
              {ordenadas.map((m) => (
                <li key={m.id}>
                  <MemberRow member={m} onOpen={() => setSheet({ kind: "edit", id: m.id })} />
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={abrirNova}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                    <IconUserAdd width={18} height={18} />
                  </span>
                  <span className="text-[15px] font-semibold text-ink">Adicionar profissional</span>
                </button>
              </li>
            </ul>
          </Card>
          <p className="mt-3 px-1 text-[12.5px] leading-snug text-ink-soft">
            Quem é da equipe vê só a própria agenda, as clientes dela e os números dela.
            Configurações, despesas, estoque, relatórios e assinatura ficam só com você.
          </p>
        </section>
      )}

      {sheet && (sheet.kind === "new" || editando) ? (
        <MemberFormSheet
          key={sheet.kind === "edit" ? sheet.id : "nova"}
          member={editando}
          usedColors={usedColors}
          avisoPlano={ativas.length === 0 ? (owner.avisoPlano ?? null) : null}
          onClose={fechar}
          onDone={concluir}
        />
      ) : null}

      <SavedToast savedAt={toast?.at} message={toast?.message} />
    </div>
  );
}

/** A dona: "Você", o e-mail e se ela também aparece no link de agendamento. */
function OwnerCard({
  owner,
  alguemNoLink,
  temEquipe,
}: {
  owner: OwnerItem;
  alguemNoLink: boolean;
  temEquipe: boolean;
}) {
  const [atende, setAtendeOtimista] = useOptimistic(owner.ownerBookable);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string>();

  // Só dá para sair do link se alguém da equipe continuar nele.
  const travado = atende && !alguemNoLink;

  function alternar(next: boolean) {
    setErro(undefined);
    startTransition(async () => {
      setAtendeOtimista(next);
      try {
        const r = await salvarDonaAtendeAction(next);
        if (!r.ok) setErro(r.error);
      } catch {
        setErro("Não foi possível salvar agora. Confira a internet e tente de novo.");
      }
    });
  }

  const dica = travado
    ? temEquipe
      ? "Para sair do link, deixe alguém da equipe atendendo por ele."
      : "Com alguém da equipe atendendo pelo link, você pode deixar de aparecer nele."
    : atende
      ? "Desligue se você só cuida da gestão: no link, as clientes escolhem entre a equipe."
      : "Você não aparece no link. As clientes escolhem entre a equipe.";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
        <MemberAvatar name={owner.name} color={OWNER_COLOR} />
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-ink">Você</p>
            <Badge>Responsável</Badge>
          </div>
          <p className="truncate text-[13px] text-ink-soft">{owner.email}</p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 sm:px-5">
        <SwitchField
          label="Você também atende pelo link de agendamento"
          hint={dica}
          checked={atende}
          onChange={alternar}
          disabled={pending || travado}
        />
        {erro ? <p className="mt-2 text-[12.5px] font-medium text-danger">{erro}</p> : null}
      </div>
    </Card>
  );
}

function MemberRow({ member, onOpen }: { member: MemberItem; onOpen: () => void }) {
  const status = !member.active
    ? { tone: "neutral" as const, label: "Desativada" }
    : member.pending
      ? { tone: "warning" as const, label: member.inviteExpired ? "Convite vencido" : "Convite pendente" }
      : { tone: "success" as const, label: "Ativa" };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:px-5"
    >
      <MemberAvatar name={member.name} color={member.color} muted={!member.active} />
      <span className="min-w-0 grow">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{member.name}</span>
          <Badge tone={status.tone} className="shrink-0">
            {status.label}
          </Badge>
        </span>
        <span className="block truncate text-[13px] text-ink-soft">{member.email}</span>
        <span className="mt-0.5 block truncate text-[12.5px] tabular-nums text-ink-faint">
          Comissão {member.commissionPct}%{member.bookableOnline ? " · Atende pelo link" : ""}
        </span>
      </span>
      <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
    </button>
  );
}
