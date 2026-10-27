"use client";

/**
 * Gestão de bloqueios: lista (semanais + avulsos), criação em Sheet e exclusão.
 * Com equipe, a dona escolhe para quem o bloqueio vale e a lista diz de quem
 * é cada um; a funcionária vê e cria só os da própria agenda.
 */
import { useActionState, useEffect, useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCalendarX, IconPlus, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { WEEKDAYS_PT } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { OWNER_KEY } from "@/lib/team-shared";
import {
  criarBloqueioAction,
  excluirBloqueio,
  type BloqueioFormState,
} from "@/app/(app)/agenda/bloqueios/actions";
import type { AgendaBloqueio } from "./types";
import { ESTUDIO_KEY, ProDot } from "./pro";

const estadoInicial: BloqueioFormState = {};

/** Opção de "Para quem" (estúdio inteiro, a dona ou uma funcionária). */
export type OpcaoPara = { key: string; rotulo: string; cor: string | null };

type BloqueioItem = AgendaBloqueio & { paraCor?: string | null };

export function BlocksManager({
  bloqueios,
  tz,
  opcoesPara = [],
}: {
  bloqueios: BloqueioItem[];
  tz: string;
  /** Só a dona com equipe recebe; vazio = sem campo "Para quem". */
  opcoesPara?: OpcaoPara[];
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"AVULSO" | "SEMANAL">("AVULSO");
  const [para, setPara] = useState(ESTUDIO_KEY);
  const [state, formAction, pendente] = useActionState(criarBloqueioAction, estadoInicial);

  useEffect(() => {
    if (state.ok) setAberto(false);
  }, [state]);

  const semanais = bloqueios.filter((b) => b.tipo === "SEMANAL");
  const avulsos = bloqueios
    .filter((b) => b.tipo === "AVULSO")
    .sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""));
  const agoraIso = new Date().toISOString();

  return (
    <div className="space-y-5">
      <Button size="lg" onClick={() => setAberto(true)}>
        <IconPlus width={18} height={18} />
        Novo bloqueio
      </Button>

      {bloqueios.length === 0 ? (
        <EmptyState
          icon={<IconCalendarX />}
          title="Nenhum bloqueio criado"
          description="Bloqueie almoço, folgas ou férias para esses horários não aparecerem como livres."
        />
      ) : null}

      {semanais.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Semanais
          </h2>
          <ul className="rounded-2xl border border-line divide-y divide-line/70 bg-surface overflow-hidden">
            {semanais.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[15px] text-ink truncate">{b.titulo}</p>
                  <p className="text-xs text-ink-soft">
                    Toda {WEEKDAYS_PT[b.diaSemana ?? 0].toLowerCase()} · {b.horaInicio}–
                    {b.horaFim}
                  </p>
                  <ParaQuem bloqueio={b} />
                </div>
                <BotaoExcluir id={b.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {avulsos.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Avulsos
          </h2>
          <ul className="rounded-2xl border border-line divide-y divide-line/70 bg-surface overflow-hidden">
            {avulsos.map((b) => {
              const passado = (b.fim ?? "") < agoraIso;
              return (
                <li
                  key={b.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3",
                    passado && "opacity-50",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] text-ink truncate">{b.titulo}</p>
                    <p className="text-xs text-ink-soft">
                      {b.inicio ? formatDateTime(new Date(b.inicio), tz) : ""} até{" "}
                      {b.fim ? formatDateTime(new Date(b.fim), tz) : ""}
                    </p>
                    <ParaQuem bloqueio={b} />
                  </div>
                  <BotaoExcluir id={b.id} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Sheet open={aberto} onClose={() => setAberto(false)} title="Novo bloqueio" tall>
        <form action={formAction} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-sunken rounded-xl">
            {(["AVULSO", "SEMANAL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition-colors",
                  tipo === t ? "bg-surface text-ink shadow-sm" : "text-ink-soft",
                )}
              >
                {t === "AVULSO" ? "Avulso" : "Semanal"}
              </button>
            ))}
          </div>
          <input type="hidden" name="tipo" value={tipo} />

          {opcoesPara.length > 0 ? (
            <div>
              <p id="bloq-para-rotulo" className="mb-2 text-[13px] font-semibold text-ink">
                Para quem
              </p>
              <input type="hidden" name="para" value={para} />
              <div role="group" aria-labelledby="bloq-para-rotulo" className="flex flex-wrap gap-2">
                {opcoesPara.map((o) => {
                  const marcada = o.key === para;
                  return (
                    <Chip
                      key={o.key}
                      size="sm"
                      selected={marcada}
                      onClick={() => setPara(o.key)}
                      className="h-9 px-3.5 text-[13.5px]"
                    >
                      {o.cor ? (
                        <ProDot
                          cor={o.cor}
                          className={cn("ring-[1.5px]", marcada ? "ring-accent-ink" : "ring-surface")}
                        />
                      ) : null}
                      {o.rotulo}
                    </Chip>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
                {para === ESTUDIO_KEY
                  ? "Fecha esse horário na agenda de toda a equipe."
                  : para === OWNER_KEY
                    ? "Fecha esse horário só na sua agenda; a equipe continua livre."
                    : "Fecha esse horário só na agenda dela; as outras continuam livres."}
              </p>
            </div>
          ) : null}

          <Field
            label="Título"
            htmlFor="bloq-titulo"
            hint={tipo === "AVULSO" ? "Ex.: Férias, consulta médica" : "Ex.: Almoço, faculdade"}
          >
            <Input id="bloq-titulo" name="titulo" placeholder="Nome do bloqueio" required />
          </Field>

          {tipo === "AVULSO" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de início" htmlFor="bloq-dia-inicio">
                  <Input id="bloq-dia-inicio" name="diaInicio" type="date" required />
                </Field>
                <Field label="Hora" htmlFor="bloq-hora-inicio">
                  <Input id="bloq-hora-inicio" name="horaInicio" type="time" required />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data de fim" htmlFor="bloq-dia-fim">
                  <Input id="bloq-dia-fim" name="diaFim" type="date" required />
                </Field>
                <Field label="Hora" htmlFor="bloq-hora-fim">
                  <Input id="bloq-hora-fim" name="horaFim" type="time" required />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Dia da semana" htmlFor="bloq-dia-semana">
                <Select id="bloq-dia-semana" name="diaSemana" required defaultValue="1">
                  {WEEKDAYS_PT.map((nome, i) => (
                    <option key={nome} value={i}>
                      {nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Das" htmlFor="bloq-sem-inicio">
                  <Input id="bloq-sem-inicio" name="horaInicio" type="time" required />
                </Field>
                <Field label="Até" htmlFor="bloq-sem-fim">
                  <Input id="bloq-sem-fim" name="horaFim" type="time" required />
                </Field>
              </div>
            </>
          )}

          {state.erro ? (
            <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">
              {state.erro}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={pendente}>
            {pendente ? "Salvando..." : "Salvar bloqueio"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

/** A quem o bloqueio vale (só aparece com equipe, para a dona). */
function ParaQuem({ bloqueio }: { bloqueio: BloqueioItem }) {
  if (!bloqueio.para) return null;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
      {bloqueio.paraCor ? <ProDot cor={bloqueio.paraCor} className="h-2 w-2" /> : null}
      {bloqueio.estudioInteiro
        ? "Estúdio inteiro"
        : `Só para ${bloqueio.para === "Você" ? "você" : bloqueio.para}`}
    </p>
  );
}

function BotaoExcluir({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, startExclusao] = useTransition();

  useEffect(() => {
    if (!confirmando) return;
    const timer = setTimeout(() => setConfirmando(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmando]);

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        aria-label="Excluir bloqueio"
        className="p-2 rounded-full text-ink-faint hover:text-danger hover:bg-danger-soft shrink-0"
      >
        <IconTrash width={18} height={18} />
      </button>
    );
  }
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pendente}
      onClick={() => startExclusao(async () => void (await excluirBloqueio(id)))}
      className="shrink-0"
    >
      {pendente ? "Excluindo..." : "Excluir?"}
    </Button>
  );
}
