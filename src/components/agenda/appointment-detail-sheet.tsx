"use client";

/** Sheet de detalhe de um agendamento + ações (sinal, concluir, falta, cancelar, reagendar). */
import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AppointmentStatusBadge, Badge } from "@/components/ui/badge";
import { IconWhatsApp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { formatPhone, waLink } from "@/lib/phone";
import {
  formatDateLong,
  formatDateTime,
  formatTime,
  localDayKey,
} from "@/lib/dates";
import {
  cancelarAgendamento,
  concluirAgendamento,
  horariosLivres,
  marcarFalta,
  reagendarAgendamento,
  sinalRecebido,
} from "@/app/(app)/agenda/actions";
import type { AgendaCompromisso, AgendaConfig, EsperaChamada } from "./types";
import { ContraindicacaoAlert } from "./contra-alert";

type Modo = "detalhe" | "cancelar" | "falta" | "reagendar" | "espera";

export function AppointmentDetailSheet({
  compromisso,
  onClose,
  config,
}: {
  compromisso: AgendaCompromisso | null;
  onClose: () => void;
  config: AgendaConfig;
}) {
  const tz = config.timezone;
  const [modo, setModo] = useState<Modo>("detalhe");
  const [espera, setEspera] = useState<EsperaChamada[]>([]);
  const [tituloEspera, setTituloEspera] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startAcao] = useTransition();

  // Reagendamento
  const [novoDia, setNovoDia] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);

  const id = compromisso?.id ?? null;
  const aberto = compromisso !== null;
  useEffect(() => {
    if (!aberto || !compromisso) return;
    setModo("detalhe");
    setEspera([]);
    setErro(null);
    setNovoDia(localDayKey(new Date(compromisso.inicio), tz));
    setNovaHora("");
    setSlots(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, aberto]);

  const servicoId = compromisso?.servico.id ?? null;
  useEffect(() => {
    if (modo !== "reagendar" || !id || !servicoId || !novoDia) return;
    let ativo = true;
    setSlots(null);
    horariosLivres({ dia: novoDia, servicoId, ignorarId: id })
      .then((r) => ativo && setSlots(r.slots))
      .catch(() => ativo && setSlots([]));
    return () => {
      ativo = false;
    };
  }, [modo, id, servicoId, novoDia]);

  if (!compromisso) return null;

  const c = compromisso;
  const inicio = new Date(c.inicio);
  const fim = new Date(c.fim);
  const ativo = c.status === "PRE_AGENDADO" || c.status === "CONFIRMADO";
  const tardio =
    inicio.getTime() - Date.now() < config.cancellationWindowHours * 3_600_000;

  function rodarAcao(fn: () => Promise<{ ok: boolean; erro?: string } | void>) {
    setErro(null);
    startAcao(async () => {
      const res = await fn();
      if (res && !res.ok) setErro(res.erro ?? "Não foi possível concluir a ação.");
    });
  }

  function confirmarSinal() {
    rodarAcao(async () => {
      const res = await sinalRecebido(c.id);
      if (res.ok) onClose();
      return res;
    });
  }

  function concluir() {
    rodarAcao(async () => {
      const res = await concluirAgendamento(c.id);
      return res; // sucesso redireciona para a ficha técnica
    });
  }

  function confirmarFalta() {
    rodarAcao(async () => {
      const res = await marcarFalta(c.id);
      if (res.ok) onClose();
      return res;
    });
  }

  function confirmarCancelamento() {
    rodarAcao(async () => {
      const res = await cancelarAgendamento(c.id);
      if (!res.ok) return res;
      if (res.espera.length > 0) {
        setTituloEspera(
          `${formatDateLong(inicio, tz)} às ${formatTime(inicio, tz)} ficou livre`,
        );
        setEspera(res.espera);
        setModo("espera");
      } else {
        onClose();
      }
      return res;
    });
  }

  function confirmarReagendamento() {
    if (!novaHora) return;
    rodarAcao(async () => {
      const res = await reagendarAgendamento({ id: c.id, dia: novoDia, hora: novaHora });
      if (!res.ok) return res;
      if (res.espera.length > 0) {
        setTituloEspera(
          `${formatDateLong(inicio, tz)} às ${formatTime(inicio, tz)} ficou livre`,
        );
        setEspera(res.espera);
        setModo("espera");
      } else {
        onClose();
      }
      return res;
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={modo === "espera" ? "Lista de espera" : "Agendamento"}
      tall={modo === "reagendar"}
    >
      {modo === "espera" ? (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-ink-soft">
            {tituloEspera}. Essas clientes da lista de espera encaixam nesse período:
          </p>
          <ul className="space-y-2.5">
            {espera.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[15px] text-ink truncate">{e.nome}</p>
                  <p className="text-xs text-ink-soft">
                    {formatPhone(e.telefone)}
                    {e.periodo ? ` · ${e.periodo}` : ""}
                  </p>
                </div>
                <a
                  href={e.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-success-soft text-success text-sm font-medium"
                >
                  <IconWhatsApp width={16} height={16} />
                  Chamar
                </a>
              </li>
            ))}
          </ul>
          <Button size="lg" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Cabeçalho do agendamento */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold text-ink truncate">
                {c.cliente.nome}
              </p>
              <p className="text-sm text-ink-soft capitalize">
                {formatDateLong(inicio, tz)}
              </p>
              <p className="text-sm text-ink-soft tabular-nums">
                {formatTime(inicio, tz)}–{formatTime(fim, tz)} · {c.servico.nome}
              </p>
            </div>
            <AppointmentStatusBadge status={c.status} />
          </div>

          {c.cliente.temContraindicacao ? (
            <ContraindicacaoAlert flags={c.cliente.flags} />
          ) : null}

          <div className="rounded-xl border border-line divide-y divide-line/70">
            <InfoLinha rotulo="Valor" valor={formatBRL(c.precoCents)} />
            {c.sinalExigido ? (
              <InfoLinha
                rotulo="Sinal"
                valor={
                  c.sinalCents !== null
                    ? `${formatBRL(c.sinalCents)}${
                        c.sinalPagoEm
                          ? ` · pago em ${formatDateTime(new Date(c.sinalPagoEm), tz)}`
                          : " · aguardando"
                      }`
                    : "aguardando"
                }
              />
            ) : null}
            <InfoLinha
              rotulo="WhatsApp"
              valor={
                <a
                  href={waLink(c.cliente.telefone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-success font-medium"
                >
                  <IconWhatsApp width={15} height={15} />
                  {formatPhone(c.cliente.telefone)}
                </a>
              }
            />
            {c.cliente.faltas > 0 ? (
              <InfoLinha
                rotulo="Histórico"
                valor={
                  <Badge tone="danger">
                    {c.cliente.faltas} falta{c.cliente.faltas === 1 ? "" : "s"}
                  </Badge>
                }
              />
            ) : null}
            {c.observacoes ? <InfoLinha rotulo="Observações" valor={c.observacoes} /> : null}
          </div>

          {erro ? (
            <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">
              {erro}
            </p>
          ) : null}

          {/* Ações por status */}
          {modo === "detalhe" ? (
            <div className="space-y-2.5">
              {c.status === "PRE_AGENDADO" ? (
                <Button size="lg" onClick={confirmarSinal} disabled={pendente}>
                  {pendente ? "Confirmando..." : "Sinal recebido — confirmar horário"}
                </Button>
              ) : null}
              {ativo ? (
                <>
                  <Button
                    size="lg"
                    variant={c.status === "CONFIRMADO" ? "primary" : "secondary"}
                    onClick={concluir}
                    disabled={pendente}
                  >
                    {pendente ? "Um instante..." : "Concluir atendimento"}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => setModo("reagendar")}
                    disabled={pendente}
                  >
                    Reagendar
                  </Button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      size="md"
                      variant="danger-soft"
                      onClick={() => setModo("falta")}
                      disabled={pendente}
                      className="w-full"
                    >
                      Faltou
                    </Button>
                    <Button
                      size="md"
                      variant="ghost"
                      onClick={() => setModo("cancelar")}
                      disabled={pendente}
                      className="w-full border border-line"
                    >
                      Cancelar horário
                    </Button>
                  </div>
                </>
              ) : null}
              {c.status === "CONCLUIDO" ? (
                <Link
                  href={`/atendimentos/${c.id}`}
                  className="flex h-12 items-center justify-center rounded-xl bg-accent text-accent-ink font-medium"
                >
                  Abrir ficha técnica
                </Link>
              ) : null}
              {c.status === "FALTOU" ? (
                <p className="text-sm text-ink-soft text-center">
                  Falta registrada no histórico da cliente.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Confirmação de falta */}
          {modo === "falta" ? (
            <div className="space-y-2.5">
              <p className="text-sm text-ink-soft bg-surface-sunken/70 rounded-xl px-3.5 py-3">
                Marcar falta registra +1 no histórico de faltas de {c.cliente.nome}
                {config.noShowThreshold > 0
                  ? ` — a partir de ${config.noShowThreshold} falta${config.noShowThreshold === 1 ? "" : "s"}, sinal passa a ser exigido sempre.`
                  : "."}
              </p>
              <Button size="lg" variant="danger" onClick={confirmarFalta} disabled={pendente}>
                {pendente ? "Registrando..." : "Confirmar falta"}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setModo("detalhe")}>
                Voltar
              </Button>
            </div>
          ) : null}

          {/* Confirmação de cancelamento */}
          {modo === "cancelar" ? (
            <div className="space-y-2.5">
              {tardio ? (
                <p className="text-sm text-warning bg-warning-soft rounded-xl px-3.5 py-3">
                  Faltam menos de {config.cancellationWindowHours}h para o horário — será
                  registrado como <strong>cancelamento tardio</strong> e contará no
                  histórico da cliente.
                </p>
              ) : (
                <p className="text-sm text-ink-soft bg-surface-sunken/70 rounded-xl px-3.5 py-3">
                  O horário será liberado na agenda. Se houver clientes na lista de
                  espera para esse período, você poderá chamá-las em seguida.
                </p>
              )}
              <Button
                size="lg"
                variant="danger"
                onClick={confirmarCancelamento}
                disabled={pendente}
              >
                {pendente ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setModo("detalhe")}>
                Voltar
              </Button>
            </div>
          ) : null}

          {/* Reagendamento */}
          {modo === "reagendar" ? (
            <div className="space-y-4">
              <Field label="Nova data" htmlFor="reag-dia">
                <Input
                  id="reag-dia"
                  type="date"
                  value={novoDia}
                  onChange={(e) => {
                    setNovoDia(e.target.value);
                    setNovaHora("");
                  }}
                />
              </Field>
              <div>
                <p className="text-[13px] font-medium text-ink-soft mb-1.5">
                  Horários livres
                </p>
                {slots === null ? (
                  <p className="text-sm text-ink-faint py-2">Buscando horários...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-ink-faint py-2">
                    Nenhum horário livre nesse dia.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setNovaHora(s)}
                        className={cn(
                          "h-9 px-3.5 rounded-full border text-sm font-medium tabular-nums transition-colors",
                          novaHora === s
                            ? "bg-accent text-accent-ink border-accent"
                            : "border-line text-ink-soft hover:bg-surface-sunken",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Field label="Ou informe a hora" htmlFor="reag-hora">
                <Input
                  id="reag-hora"
                  type="time"
                  value={novaHora}
                  onChange={(e) => setNovaHora(e.target.value)}
                />
              </Field>
              <Button
                size="lg"
                onClick={confirmarReagendamento}
                disabled={!novaHora || pendente}
              >
                {pendente
                  ? "Reagendando..."
                  : novaHora
                    ? `Confirmar novo horário — ${novaHora}`
                    : "Escolha um horário"}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setModo("detalhe")}>
                Voltar
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

function InfoLinha({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <span className="text-sm text-ink-soft shrink-0">{rotulo}</span>
      <span className="text-sm text-ink text-right min-w-0">{valor}</span>
    </div>
  );
}
