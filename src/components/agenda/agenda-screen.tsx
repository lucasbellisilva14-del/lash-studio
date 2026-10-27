"use client";

/**
 * Tela da Agenda. PC: coluna com mini calendário, visão, filtro de
 * profissional e legenda + área principal com a linha do tempo. Celular:
 * faixa da semana, filtro de profissional e a linha do tempo. Sheets de
 * criação e detalhe por cima. Sem equipe, nada de filtro nem de nomes.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Fab } from "@/components/ui/fab";
import { buttonClasses } from "@/components/ui/button";
import {
  IconCalendarX,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconPlus,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  formatDateLong,
  formatWithPattern,
  localWeekday,
} from "@/lib/dates";
import { ALL_KEY, OWNER_KEY } from "@/lib/team-shared";
import type {
  AgendaBloqueio,
  AgendaCliente,
  AgendaCompromisso,
  AgendaConfig,
  AgendaPro,
  AgendaServico,
  AgendaViewer,
  HorarioFuncionamento,
  VisaoAgenda,
} from "./types";
import { agendaHref } from "./pro";
import { ProFilterChips } from "./pro-filter";
import { DayTimeline } from "./day-timeline";
import { WeekList } from "./week-list";
import { MiniCalendar } from "./mini-calendar";
import { WeekStrip } from "./week-strip";
import { MonthDayList } from "./month-day-list";
import { NewAppointmentSheet } from "./new-appointment-sheet";
import { AppointmentDetailSheet } from "./appointment-detail-sheet";

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const VISOES: Array<{ valor: VisaoAgenda; rotulo: string }> = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
];

const LEGENDA = [
  { rotulo: "Aplicação", fundo: "var(--cat-aplicacao)", linha: "var(--cat-aplicacao-line)" },
  { rotulo: "Manutenção", fundo: "var(--cat-manutencao)", linha: "var(--cat-manutencao-line)" },
  { rotulo: "Lash lifting", fundo: "var(--cat-lifting)", linha: "var(--cat-lifting-line)" },
  { rotulo: "Outros", fundo: "var(--cat-outro)", linha: "var(--cat-outro-line)" },
];

type Mes = {
  chaves: string[];
  contagem: Record<string, number>;
  rotulo: string;
  anteriorKey: string;
  seguinteKey: string;
};

/** Seletor Dia/Semana/Mês (links: cada visão tem sua URL, com o filtro junto). */
function SeletorVisao({
  visao,
  diaKey,
  prof,
}: {
  visao: VisaoAgenda;
  diaKey: string;
  prof: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-full bg-surface p-1 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
      {VISOES.map((v) => (
        <Link
          key={v.valor}
          href={agendaHref(v.valor, diaKey, prof)}
          scroll={false}
          aria-current={visao === v.valor ? "page" : undefined}
          className={cn(
            "flex h-9 items-center justify-center rounded-full text-[13.5px] font-semibold transition-colors",
            visao === v.valor ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          {v.rotulo}
        </Link>
      ))}
    </div>
  );
}

export function AgendaScreen({
  visao,
  diaKey,
  hojeKey,
  anteriorKey,
  proximoKey,
  compromissos,
  mes,
  semana,
  clientes,
  servicos,
  horarios,
  bloqueios,
  config,
  novoInicial,
  clienteInicialId,
  viewer,
  comEquipe,
  equipe,
  filtroKey,
  prof,
}: {
  visao: VisaoAgenda;
  diaKey: string;
  hojeKey: string;
  anteriorKey: string;
  proximoKey: string;
  compromissos: AgendaCompromisso[];
  mes: Mes;
  semana: string[];
  clientes: AgendaCliente[];
  servicos: AgendaServico[];
  horarios: HorarioFuncionamento[];
  bloqueios: AgendaBloqueio[];
  config: AgendaConfig;
  novoInicial: boolean;
  clienteInicialId: string | null;
  viewer: AgendaViewer;
  /** O estúdio tem equipe ativa (mostra "Com Ana" no detalhe). */
  comEquipe: boolean;
  /**
   * Equipe ativa (a dona primeiro) — só a dona recebe. Filtro e seletor de
   * profissional só aparecem com 2+; com 1 (só ela) serve de destino do
   * "Trocar profissional" para horários de quem foi desativada.
   */
  equipe: AgendaPro[];
  /** Filtro atual: ALL_KEY ou a chave da profissional. */
  filtroKey: string;
  /** Valor de ?prof= que os links preservam (nulo = "todas"/sem filtro). */
  prof: string | null;
}) {
  const router = useRouter();
  const tz = config.timezone;
  const [novoAberto, setNovoAberto] = useState(novoInicial);
  const [novaHora, setNovaHora] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<AgendaCompromisso | null>(null);
  const [avisoCriacao, setAvisoCriacao] = useState<string | null>(null);

  /**
   * Em "todas", cada horário diz quem atende quando a visão mistura
   * profissionais: com equipe, ou quando sobraram horários de alguém que foi
   * desativada. Sem equipe (nunca teve), nada aparece.
   */
  const mostrarPro =
    viewer.isOwner &&
    filtroKey === ALL_KEY &&
    (equipe.length > 1 || compromissos.some((c) => c.profissional.memberId !== null));
  /** Novo agendamento começa na profissional do filtro (ou na dona). */
  const proPadraoKey = filtroKey === ALL_KEY ? OWNER_KEY : filtroKey;

  const diaLongo = useMemo(
    () => capitalizar(formatDateLong(dayKeyToUtcStart(diaKey, tz), tz)),
    [diaKey, tz],
  );

  const rotuloPeriodo = useMemo(() => {
    const inicio = dayKeyToUtcStart(diaKey, tz);
    if (visao === "dia") return diaLongo;
    if (visao === "semana") {
      const start = addDays(inicio, -((localWeekday(inicio, tz) + 6) % 7));
      const end = addDays(start, 6);
      return `${formatWithPattern(start, "dd/MM", tz)} – ${formatWithPattern(end, "dd/MM", tz)}`;
    }
    return mes.rotulo;
  }, [visao, diaKey, tz, diaLongo, mes.rotulo]);

  const marcados = mes.contagem[diaKey] ?? 0;
  const rotuloMarcados =
    marcados === 0
      ? "Nenhum horário marcado"
      : `${marcados} ${marcados === 1 ? "horário marcado" : "horários marcados"}`;

  function abrirNovo(hora: string | null = null) {
    setNovaHora(hora);
    setNovoAberto(true);
  }

  function fecharNovo() {
    setNovoAberto(false);
    setNovaHora(null);
    if (novoInicial) {
      router.replace(agendaHref(visao, diaKey, prof));
    }
  }

  function aoCriar(resultado: { dia: string; aviso: string | null; proKey: string | null }) {
    setNovoAberto(false);
    setAvisoCriacao(resultado.aviso);
    // Filtrando uma profissional e agendou para outra: mostra a agenda de quem vai atender.
    const destino = prof && resultado.proKey && resultado.proKey !== prof ? resultado.proKey : prof;
    router.push(agendaHref("dia", resultado.dia, destino));
  }

  const filtroCelular =
    equipe.length > 1 ? (
      <ProFilterChips equipe={equipe} filtroKey={filtroKey} visao={visao} diaKey={diaKey} rolavel />
    ) : null;

  const navPeriodo = (
    <div className="flex items-center gap-1">
      <Link
        href={agendaHref(visao, anteriorKey, prof)}
        scroll={false}
        aria-label="Período anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] hover:text-ink"
      >
        <IconChevronLeft width={17} height={17} />
      </Link>
      <Link
        href={agendaHref(visao, proximoKey, prof)}
        scroll={false}
        aria-label="Próximo período"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)] hover:text-ink"
      >
        <IconChevronRight width={17} height={17} />
      </Link>
    </div>
  );

  const linkHoje =
    diaKey !== hojeKey ? (
      <Link href={agendaHref(visao, hojeKey, prof)} scroll={false} className={buttonClasses("secondary", "sm")}>
        Hoje
      </Link>
    ) : null;

  return (
    <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* ── Coluna da esquerda (PC) ── */}
      <aside className="hidden space-y-4 lg:sticky lg:top-9 lg:block">
        <div className="pb-1">
          <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">
            Agenda
          </h1>
          <p className="mt-3 text-[15px] font-bold tracking-[-0.01em] text-ink">{diaLongo}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">{rotuloMarcados}</p>
        </div>
        <MiniCalendar
          chaves={mes.chaves}
          contagem={mes.contagem}
          diaKey={diaKey}
          hojeKey={hojeKey}
          visao={visao === "mes" ? "dia" : visao}
          mesLabel={mes.rotulo}
          mesAnteriorKey={mes.anteriorKey}
          mesSeguinteKey={mes.seguinteKey}
          prof={prof}
        />
        <SeletorVisao visao={visao} diaKey={diaKey} prof={prof} />
        <ProFilterChips equipe={equipe} filtroKey={filtroKey} visao={visao} diaKey={diaKey} />
        <div className="rounded-[22px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
            {LEGENDA.map((l) => (
              <li key={l.rotulo} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                <span
                  className="h-3 w-3 shrink-0 rounded-[4px] border"
                  style={{ background: l.fundo, borderColor: l.linha }}
                />
                {l.rotulo}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-0.5 border-t border-line pt-3">
            <Link
              href="/agenda/bloqueios"
              className="flex items-center gap-2.5 rounded-full px-2 py-2 text-[13.5px] font-semibold text-ink-soft hover:bg-surface-sunken hover:text-ink"
            >
              <IconCalendarX width={17} height={17} />
              Bloqueios
            </Link>
            {viewer.isOwner ? (
              <Link
                href="/agenda/espera"
                className="flex items-center gap-2.5 rounded-full px-2 py-2 text-[13.5px] font-semibold text-ink-soft hover:bg-surface-sunken hover:text-ink"
              >
                <IconClock width={17} height={17} />
                Lista de espera
              </Link>
            ) : null}
          </div>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="min-w-0">
        {/* Celular: cabeçalho */}
        <div className="lg:hidden">
          <PageHeader
            title="Agenda"
            subtitle={
              visao === "dia" ? (
                <>
                  <span className="block">{diaLongo}</span>
                  <span className="block">{rotuloMarcados}</span>
                </>
              ) : (
                rotuloPeriodo
              )
            }
            action={
              <div className="flex items-center gap-1.5">
                {linkHoje}
                <Link
                  href="/agenda/bloqueios"
                  aria-label="Bloqueios de agenda"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]"
                >
                  <IconCalendarX width={18} height={18} />
                </Link>
                {viewer.isOwner ? (
                  <Link
                    href="/agenda/espera"
                    aria-label="Lista de espera"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-[var(--shadow-card)] ring-1 ring-[rgb(23_21_30/0.04)]"
                  >
                    <IconClock width={18} height={18} />
                  </Link>
                ) : null}
              </div>
            }
          />
          <div className="mb-4 space-y-3">
            <SeletorVisao visao={visao} diaKey={diaKey} prof={prof} />
            {visao === "dia" ? (
              <WeekStrip
                dias={semana}
                contagem={mes.contagem}
                diaKey={diaKey}
                hojeKey={hojeKey}
                semanaAnteriorKey={addDaysKey(semana[0], -7)}
                semanaSeguinteKey={addDaysKey(semana[0], 7)}
                prof={prof}
              />
            ) : visao === "semana" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-bold tabular-nums text-ink">{rotuloPeriodo}</p>
                {navPeriodo}
              </div>
            ) : null}
            {filtroCelular}
          </div>
        </div>

        {/* PC: barra de período e ações */}
        <div className="mb-4 hidden items-center justify-between gap-3 lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            {navPeriodo}
            {visao !== "dia" ? (
              <p className="truncate text-[17px] font-bold tracking-[-0.02em] text-ink">{rotuloPeriodo}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {linkHoje}
            <button type="button" onClick={() => abrirNovo()} className={buttonClasses("primary", "sm")}>
              <IconPlus width={16} height={16} />
              Agendar
            </button>
          </div>
        </div>

        {avisoCriacao ? (
          <div className="mb-4 flex items-start gap-2 rounded-[16px] bg-warning-soft px-4 py-3 text-[14px] text-warning">
            <p className="grow">{avisoCriacao}</p>
            <button
              type="button"
              onClick={() => setAvisoCriacao(null)}
              aria-label="Fechar aviso"
              className="shrink-0 rounded-full p-0.5 hover:opacity-70"
            >
              <IconX width={16} height={16} />
            </button>
          </div>
        ) : null}

        {visao === "dia" ? (
          <DayTimeline
            diaKey={diaKey}
            hojeKey={hojeKey}
            tz={tz}
            compromissos={compromissos}
            bloqueios={bloqueios}
            horarios={horarios}
            mostrarPro={mostrarPro}
            equipe={equipe}
            viewerMemberId={viewer.memberId}
            podeConfigurar={viewer.isOwner}
            onSelecionar={setDetalhe}
            onNovoHorario={(hora) => abrirNovo(hora)}
          />
        ) : null}
        {visao === "semana" ? (
          <WeekList
            diaKey={diaKey}
            hojeKey={hojeKey}
            tz={tz}
            compromissos={compromissos}
            mostrarPro={mostrarPro}
            equipe={equipe}
            viewerMemberId={viewer.memberId}
            prof={prof}
            onSelecionar={setDetalhe}
          />
        ) : null}
        {visao === "mes" ? (
          <div className="space-y-5 xl:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-start xl:gap-6 xl:space-y-0">
            <MiniCalendar
              size="lg"
              chaves={mes.chaves}
              contagem={mes.contagem}
              diaKey={diaKey}
              hojeKey={hojeKey}
              visao="mes"
              mesLabel={mes.rotulo}
              mesAnteriorKey={mes.anteriorKey}
              mesSeguinteKey={mes.seguinteKey}
              prof={prof}
            />
            <MonthDayList
              diaKey={diaKey}
              hojeKey={hojeKey}
              tz={tz}
              compromissos={compromissos}
              mostrarPro={mostrarPro}
              equipe={equipe}
              viewerMemberId={viewer.memberId}
              onSelecionar={setDetalhe}
            />
          </div>
        ) : null}
      </div>

      <Fab label="Agendar" className="lg:hidden" onClick={() => abrirNovo()} />

      <NewAppointmentSheet
        open={novoAberto}
        onClose={fecharNovo}
        clientes={clientes}
        servicos={servicos}
        config={config}
        diaInicial={diaKey >= hojeKey ? diaKey : hojeKey}
        horaInicial={novaHora}
        clienteInicialId={clienteInicialId}
        equipe={equipe}
        proInicialKey={proPadraoKey}
        onCriado={aoCriar}
      />

      <AppointmentDetailSheet
        compromisso={detalhe}
        onClose={() => setDetalhe(null)}
        config={config}
        servicos={servicos}
        viewer={viewer}
        comEquipe={comEquipe}
        equipe={equipe}
      />
    </div>
  );
}

/** Soma dias numa chave yyyy-MM-dd (calendário civil, sem fuso). */
function addDaysKey(key: string, dias: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const data = new Date(Date.UTC(y, m - 1, d + dias));
  return data.toISOString().slice(0, 10);
}
