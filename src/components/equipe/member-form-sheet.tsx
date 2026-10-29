"use client";

/**
 * Sheet de profissional da equipe: o mesmo formulário cria (gera o convite e
 * mostra o link no lugar) e edita (com convite novo e desativar/reativar).
 * Campos controlados: um erro de validação não apaga o que ela digitou.
 */
import { useActionState, useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { IconAlert, IconCheck, IconRefresh } from "@/components/ui/icons";
import { TEAM_COLORS, firstName } from "@/lib/team-shared";
import { cn } from "@/lib/cn";
import {
  alterarAcessoAction,
  gerarNovoConviteAction,
  salvarProfissionalAction,
  type MemberFormState,
} from "@/app/(app)/config/equipe/actions";
import { InvitePanel } from "./invite-panel";
import { SwitchField } from "./switch";
import { TEAM_COLOR_NAMES, type InviteInfo, type MemberItem } from "./types";

const FORM_ID = "equipe-form";
const initialState: MemberFormState = { ok: false };
const SEM_CONEXAO = "Não foi possível salvar agora. Confira a internet e tente de novo.";

export function MemberFormSheet({
  member,
  usedColors,
  avisoPlano = null,
  onClose,
  onDone,
}: {
  /** null = nova profissional. */
  member: MemberItem | null;
  /** Cores de quem já está ativa (a nova começa na primeira livre). */
  usedColors: string[];
  /** Primeira profissional num plano Lash solo: avisa a troca para Empresa. */
  avisoPlano?: string | null;
  onClose: () => void;
  /** Fecha o sheet e confirma (com aviso extra, quando houver). */
  onDone: (message: string, notice?: string) => void;
}) {
  const editing = member !== null;
  const [state, formAction, pending] = useActionState(salvarProfissionalAction, initialState);
  const [novoConvite, setNovoConvite] = useState<InviteInfo | null>(null);

  const [nome, setNome] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [cor, setCor] = useState(
    () => member?.color ?? TEAM_COLORS.find((c) => !usedColors.includes(c)) ?? TEAM_COLORS[0],
  );
  const [comissao, setComissao] = useState(String(member?.commissionPct ?? 40));
  const [noLink, setNoLink] = useState(member?.bookableOnline ?? true);

  const invite = state.invite ?? novoConvite;
  const errors = state.fieldErrors ?? {};

  // Edição salva: fecha e confirma. A criação mostra o convite no lugar.
  useEffect(() => {
    if (editing && state.ok && state.savedAt) onDone("Alterações salvas", state.notice);
  }, [editing, state.ok, state.savedAt, state.notice, onDone]);

  if (invite) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Convite pronto"
        description="O link é pessoal: só quem recebe consegue criar a senha."
        footer={
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Concluir
          </Button>
        }
      >
        {state.notice ? (
          <p className="mb-4 rounded-[14px] bg-warning-soft px-4 py-3 text-[13px] leading-snug text-ink">{state.notice}</p>
        ) : null}
        <InvitePanel invite={invite} />
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? "Editar profissional" : "Adicionar profissional"}
      description={
        editing
          ? "Nome, login, comissão e se ela aparece no link."
          : "Ela recebe um convite para criar a senha e entrar no app."
      }
      tall
      footer={
        <div className="space-y-2.5">
          {state.error ? (
            <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger">
              <IconAlert width={16} height={16} className="mt-px shrink-0" />
              {state.error}
            </p>
          ) : null}
          <Button type="submit" form={FORM_ID} size="lg" disabled={pending}>
            {pending ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar e gerar convite"}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} action={formAction} className="space-y-5" noValidate>
        {member ? <input type="hidden" name="id" value={member.id} /> : null}
        {!editing && avisoPlano ? (
          <p className="rounded-[14px] bg-warning-soft px-4 py-3 text-[13px] leading-snug text-ink">{avisoPlano}</p>
        ) : null}

        <Field label="Nome" htmlFor="equipe-nome" error={errors.name}>
          <Input
            id="equipe-nome"
            name="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Ana Souza"
            autoComplete="off"
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <Field
          label="E-mail"
          htmlFor="equipe-email"
          hint={
            editing && !member.pending
              ? "É o login dela. Se mudar, ela passa a entrar com o e-mail novo."
              : "É o login dela. O convite também vai para este e-mail."
          }
          error={errors.email}
        >
          <Input
            id="equipe-email"
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ana@email.com"
            maxLength={120}
            aria-invalid={errors.email ? true : undefined}
          />
        </Field>

        <ColorPicker value={cor} onChange={setCor} error={errors.color} />

        <Field
          label="Comissão"
          htmlFor="equipe-comissao"
          hint={
            editing
              ? "Sobre o valor recebido dos atendimentos dela, já sem a taxa da maquininha. Uma mudança vale para os próximos horários."
              : "Sobre o valor recebido dos atendimentos dela, já sem a taxa da maquininha."
          }
          error={errors.commissionPct}
        >
          <div className="relative w-28">
            <Input
              id="equipe-comissao"
              name="commissionPct"
              inputMode="numeric"
              value={comissao}
              onChange={(e) => setComissao(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="pr-9 tabular-nums"
              aria-invalid={errors.commissionPct ? true : undefined}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-soft"
            >
              %
            </span>
          </div>
        </Field>

        <SwitchField
          name="bookableOnline"
          label="Aparece no link de agendamento"
          hint="As clientes podem escolher ela ao agendar pelo seu link."
          checked={noLink}
          onChange={setNoLink}
        />
      </form>

      {member ? (
        <AcessoSection member={member} onInvite={setNovoConvite} onDone={onDone} />
      ) : null}
    </Sheet>
  );
}

/** Bolinhas de cor (as da equipe; a cor atual entra junto se for antiga). */
function ColorPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (color: string) => void;
  error?: string;
}) {
  const labelId = useId();
  const options = TEAM_COLORS.includes(value) ? TEAM_COLORS : [...TEAM_COLORS, value];

  return (
    <div>
      <p id={labelId} className="mb-1.5 text-[13px] font-semibold text-ink">
        Cor na agenda
      </p>
      <input type="hidden" name="color" value={value} />
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2.5">
        {options.map((color, i) => {
          const selected = color === value;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={TEAM_COLOR_NAMES[color] ?? `Cor ${i + 1}`}
              onClick={() => onChange(color)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-[box-shadow,transform] duration-150 active:scale-95",
                selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-105",
              )}
              style={{ backgroundColor: color }}
            >
              {selected ? <IconCheck width={18} height={18} strokeWidth={2} className="text-white" /> : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-danger">{error}</p>
      ) : (
        <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
          Os horários dela aparecem nesta cor na agenda.
        </p>
      )}
    </div>
  );
}

/** Convite (para quem ainda não criou a senha) e desativar/reativar o acesso. */
function AcessoSection({
  member,
  onInvite,
  onDone,
}: {
  member: MemberItem;
  onInvite: (invite: InviteInfo) => void;
  onDone: (message: string, notice?: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string>();
  const nome = firstName(member.name);

  function gerarConvite() {
    setErro(undefined);
    startTransition(async () => {
      try {
        const r = await gerarNovoConviteAction(member.id);
        if (r.ok && r.invite) onInvite(r.invite);
        else setErro(r.error ?? SEM_CONEXAO);
      } catch {
        setErro(SEM_CONEXAO);
      }
    });
  }

  function alterarAcesso(ativo: boolean) {
    setErro(undefined);
    startTransition(async () => {
      try {
        const r = await alterarAcessoAction(member.id, ativo);
        if (r.ok) onDone(ativo ? "Acesso reativado" : "Acesso desativado", r.notice);
        else setErro(r.error ?? SEM_CONEXAO);
      } catch {
        setErro(SEM_CONEXAO);
      }
    });
  }

  return (
    <section aria-label="Acesso" className="mt-6 space-y-3 border-t border-line pt-5">
      <p className="text-[13px] font-semibold text-ink">Acesso</p>

      {member.active && member.pending ? (
        <div className="rounded-[18px] border border-line p-4">
          <p className="text-[14px] font-semibold text-ink">
            {member.inviteExpired ? "O convite venceu" : "Convite pendente"}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {member.inviteExpired
              ? `${member.inviteLabel ?? "Venceu"}. Gere um novo para ${nome} criar a senha.`
              : `${member.inviteLabel ?? "Ainda vale"}. ${nome} ainda não criou a senha. Um convite novo cancela o anterior.`}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={gerarConvite}
            disabled={pending}
          >
            <IconRefresh width={16} height={16} />
            Gerar novo convite
          </Button>
        </div>
      ) : null}

      {member.active ? (
        confirmando ? (
          <div className="rounded-[18px] border border-line p-4">
            <p className="text-[14px] font-semibold text-ink">Desativar o acesso de {nome}?</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-soft">
              Ela deixa de entrar no app na hora e sai do link de agendamento. Os atendimentos e os
              números dela continuam guardados no estúdio.
            </p>
            {member.futureCount > 0 ? (
              <p className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-warning-soft px-3 py-2.5 text-[13px] leading-snug text-ink">
                <IconAlert width={16} height={16} className="mt-px shrink-0 text-warning" />
                {member.futureCount === 1
                  ? "Ela tem 1 horário marcado daqui para frente. Ele continua na agenda: troque a profissional ou remarque."
                  : `Ela tem ${member.futureCount} horários marcados daqui para frente. Eles continuam na agenda: troque a profissional ou remarque.`}
              </p>
            ) : null}
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => alterarAcesso(false)}
                disabled={pending}
              >
                {pending ? "Desativando..." : "Desativar acesso"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmando(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="danger-soft"
            className="w-full"
            onClick={() => setConfirmando(true)}
            disabled={pending}
          >
            Desativar acesso
          </Button>
        )
      ) : (
        <div className="rounded-[18px] border border-line p-4">
          <p className="text-[14px] font-semibold text-ink">Acesso desativado</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {nome} não entra no app nem aparece no link de agendamento.
          </p>
          <Button
            type="button"
            variant="success-soft"
            size="sm"
            className="mt-3"
            onClick={() => alterarAcesso(true)}
            disabled={pending}
          >
            {pending ? "Reativando..." : "Reativar acesso"}
          </Button>
        </div>
      )}

      {erro ? (
        <p role="alert" className="flex items-start gap-2 text-[13px] font-medium text-danger">
          <IconAlert width={16} height={16} className="mt-px shrink-0" />
          {erro}
        </p>
      ) : null}
    </section>
  );
}
