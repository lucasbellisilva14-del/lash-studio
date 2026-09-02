"use client";

/** Tela da Agenda: navegação dia/semana/mês + sheets de criação e detalhe. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Fab } from "@/components/ui/fab";
import {
  IconCalendarX,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  dayKeyToUtcStart,
  formatDateLong,
  formatWithPattern,
  localWeekday,
} from "@/lib/dates";
import type {
  AgendaBloqueio,
  AgendaCliente,
  AgendaCompromisso,
  AgendaConfig,
  AgendaServico,
  HorarioFuncionamento,
  VisaoAgenda,
} from "./types";
import { DayTimeline } from "./day-timeline";
import { WeekList } from "./week-list";
import { MonthGrid } from "./month-grid";
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

export function AgendaScreen({
  visao,
  diaKey,
  hojeKey,
  anteriorKey,
  proximoKey,
  compromissos,
  mes,
  clientes,
  servicos,
  horarios,
  bloqueios,
  config,
  novoInicial,
  clienteInicialId,
}: {
  visao: VisaoAgenda;
  diaKey: string;
  hojeKey: string;
  anteriorKey: string;
  proximoKey: string;
  compromissos: AgendaCompromisso[];
  mes: { chaves: string[]; contagem: Record<string, number> } | null;
  clientes: AgendaCliente[];
  servicos: AgendaServico[];
  horarios: HorarioFuncionamento[];
  bloqueios: AgendaBloqueio[];
  config: AgendaConfig;
  novoInicial: boolean;
  clienteInicialId: string | null;
}) {
  const router = useRouter();
  const tz = config.timezone;
  const [novoAberto, setNovoAberto] = useState(novoInicial);
  const [detalhe, setDetalhe] = useState<AgendaCompromisso | null>(null);
  const [avisoCriacao, setAvisoCriacao] = useState<string | null>(null);

  const rotuloPeriodo = useMemo(() => {
    const inicio = dayKeyToUtcStart(diaKey, tz);
    if (visao === "dia") return capitalizar(formatDateLong(inicio, tz));
    if (visao === "semana") {
      const weekday = localWeekday(inicio, tz);
      const start = addDays(inicio, -weekday);
      const end = addDays(start, 6);
      return `${formatWithPattern(start, "dd/MM", tz)} – ${formatWithPattern(end, "dd/MM", tz)}`;
    }
    return capitalizar(formatWithPattern(inicio, "MMMM 'de' yyyy", tz));
  }, [visao, diaKey, tz]);

  function fecharNovo() {
    setNovoAberto(false);
    if (novoInicial) {
      router.replace(`/agenda?visao=${visao}&dia=${diaKey}`);
    }
  }

  function aoCriar(resultado: { dia: string; aviso: string | null }) {
    setNovoAberto(false);
    setAvisoCriacao(resultado.aviso);
    router.push(`/agenda?visao=dia&dia=${resultado.dia}`);
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        action={
          <div className="flex items-center gap-1">
            <Link
              href="/agenda/bloqueios"
              aria-label="Bloqueios de agenda"
              title="Bloqueios"
              className="p-2 rounded-full text-ink-soft hover:bg-surface-sunken"
            >
              <IconCalendarX width={20} height={20} />
            </Link>
            <Link
              href="/agenda/espera"
              aria-label="Lista de espera"
              title="Lista de espera"
              className="p-2 rounded-full text-ink-soft hover:bg-surface-sunken"
            >
              <IconClock width={20} height={20} />
            </Link>
          </div>
        }
      />

      {/* Segmented control de visão */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-sunken rounded-xl mb-3">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={`/agenda?visao=${v.valor}&dia=${diaKey}`}
            aria-current={visao === v.valor ? "page" : undefined}
            className={cn(
              "h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
              visao === v.valor
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {v.rotulo}
          </Link>
        ))}
      </div>

      {/* Navegação anterior / rótulo / próximo + Hoje */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link
          href={`/agenda?visao=${visao}&dia=${anteriorKey}`}
          aria-label="Período anterior"
          className="p-2 -ml-2 rounded-full text-ink-soft hover:bg-surface-sunken"
        >
          <IconChevronLeft />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-[15px] text-ink truncate">
            {rotuloPeriodo}
          </span>
          {diaKey !== hojeKey ? (
            <Link
              href={`/agenda?visao=${visao}&dia=${hojeKey}`}
              className="text-xs font-medium text-accent-strong bg-accent-soft rounded-full px-2.5 py-1 shrink-0"
            >
              Hoje
            </Link>
          ) : null}
        </div>
        <Link
          href={`/agenda?visao=${visao}&dia=${proximoKey}`}
          aria-label="Próximo período"
          className="p-2 -mr-2 rounded-full text-ink-soft hover:bg-surface-sunken"
        >
          <IconChevronRight />
        </Link>
      </div>

      {avisoCriacao ? (
        <div className="flex items-start gap-2 bg-warning-soft text-warning rounded-xl px-3.5 py-3 mb-4 text-sm">
          <p className="grow">{avisoCriacao}</p>
          <button
            onClick={() => setAvisoCriacao(null)}
            aria-label="Fechar aviso"
            className="shrink-0 p-0.5 rounded-full hover:opacity-70"
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
          onSelecionar={setDetalhe}
        />
      ) : null}
      {visao === "semana" ? (
        <WeekList
          diaKey={diaKey}
          hojeKey={hojeKey}
          tz={tz}
          compromissos={compromissos}
          onSelecionar={setDetalhe}
        />
      ) : null}
      {visao === "mes" && mes ? (
        <MonthGrid
          chaves={mes.chaves}
          contagem={mes.contagem}
          diaKey={diaKey}
          hojeKey={hojeKey}
        />
      ) : null}

      <Fab label="Agendar" onClick={() => setNovoAberto(true)} />

      <NewAppointmentSheet
        open={novoAberto}
        onClose={fecharNovo}
        clientes={clientes}
        servicos={servicos}
        config={config}
        diaInicial={diaKey >= hojeKey ? diaKey : hojeKey}
        clienteInicialId={clienteInicialId}
        onCriado={aoCriar}
      />

      <AppointmentDetailSheet
        compromisso={detalhe}
        onClose={() => setDetalhe(null)}
        config={config}
        servicos={servicos}
      />
    </div>
  );
}
