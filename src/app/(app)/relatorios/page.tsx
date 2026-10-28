import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner, requireProfessional } from "@/lib/session";
import { ALL_KEY, initials, parseProFilter, proLabel } from "@/lib/team-shared";
import { Card } from "@/components/ui/card";
import { IconChevronRight, IconFile } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ProFilter, type ProFilterOption } from "@/components/financeiro/pro-filter";
import { PeriodoSwitch } from "@/components/relatorios/periodo-switch";
import { ReportSection } from "@/components/relatorios/section";
import { StatusGroups } from "@/components/relatorios/status-groups";
import { LtvRanking } from "@/components/relatorios/ltv-ranking";
import { ServicosChart } from "@/components/relatorios/servicos-chart";
import { DemandaChart } from "@/components/relatorios/demanda-chart";
import { OrigensChart } from "@/components/relatorios/origens-chart";
import { EquipeIndicadores, type EquipeLinha } from "@/components/relatorios/equipe-indicadores";
import { IndicadoresCards, itensDosIndicadores } from "@/components/relatorios/indicadores";
import {
  getRelatoriosData,
  janelaDoPeriodo,
  profissionaisDoPeriodo,
  type PeriodoRelatorio,
  type ProRelatorio,
} from "./data";
import { fechamentoHref, parsePeriodo, primeiro, relatoriosHref } from "./links";

export const metadata: Metadata = { title: "Relatórios" };

const PERIODO_LABELS: Record<PeriodoRelatorio, string> = {
  30: "últimos 30 dias",
  90: "últimos 90 dias",
  365: "últimos 12 meses",
};

/**
 * /relatorios (só a dona). Com equipe: filtro por profissional (?prof=) abaixo
 * do período; em "Estúdio todo", a seção Equipe com os indicadores de cada
 * uma; com uma profissional, os indicadores dela no topo e as seções olhando
 * só o que é dela. Sem equipe, a tela é a de sempre.
 */
export default async function RelatoriosPage(props: PageProps<"/relatorios">) {
  const viewer = await requireOwner();
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const periodo = parsePeriodo(primeiro(sp.periodo));
  const agora = new Date();
  const janela = janelaDoPeriodo(periodo, professional.timezone, agora);

  // A dona, a equipe ativa e quem saiu mas teve agendamento no período.
  const pros = await profissionaisDoPeriodo(
    professional.id,
    janela.inicio.getTime(),
    janela.fim.getTime(),
    false,
  );
  const comEquipe = pros.length > 1;
  const filtro = comEquipe ? parseProFilter(primeiro(sp.prof), pros) : null;
  const pro: ProRelatorio | null =
    filtro && !filtro.all ? (pros.find((p) => p.key === filtro.pro.key) ?? null) : null;
  const nomeDe = (p: ProRelatorio) => proLabel(p, viewer.memberId);
  /** "Você" (a dona) ou o primeiro nome da profissional filtrada. */
  const nomePro = pro ? nomeDe(pro) : null;
  const profUrl = pro?.key ?? null;

  const data = await getRelatoriosData(professional, janela, {
    agora,
    filtro: pro ? { memberId: pro.memberId, nome: pro.isOwner ? null : nomePro } : null,
    indicadoresPara: !comEquipe ? [] : pro ? [pro.memberId] : pros.map((p) => p.memberId),
  });
  const periodoLabel = PERIODO_LABELS[periodo];

  const opcoes: ProFilterOption[] = [
    {
      key: ALL_KEY,
      label: "Estúdio todo",
      color: null,
      href: relatoriosHref({ periodo }),
      selected: !pro,
    },
    ...pros.map((p) => ({
      key: p.key,
      label: nomeDe(p),
      color: p.color,
      href: relatoriosHref({ periodo, prof: p.key }),
      selected: pro?.key === p.key,
    })),
  ];

  // Indicadores: da profissional filtrada, ou uma linha por profissional em "Estúdio todo".
  const indicadoresDaPro = pro ? data.indicadores.get(pro.memberId) : undefined;
  const equipe: EquipeLinha[] =
    comEquipe && !pro
      ? pros.flatMap((p) => {
          const ind = data.indicadores.get(p.memberId);
          if (!ind) return [];
          return [
            {
              key: p.key,
              label: nomeDe(p),
              initials: initials(p.name),
              color: p.color,
              inactive: !p.ativa,
              href: relatoriosHref({ periodo, prof: p.key }, "filtros"),
              concluidos: ind.concluidos,
              itens: itensDosIndicadores(ind, { quem: p.isOwner ? "voce" : "ela", recorte: "período" }),
            },
          ];
        })
      : [];

  // Com uma profissional, cada seção diz de quem é.
  const clientesDela = pro
    ? pro.isOwner
      ? "que você já atendeu"
      : `que ${nomePro} já atendeu`
    : undefined;
  const vazioDeClientes = pro
    ? {
        title: pro.isOwner
          ? "Nenhuma cliente atendida por você"
          : `Nenhuma cliente atendida por ${nomePro}`,
        description: pro.isOwner
          ? "Quando você concluir um atendimento, a cliente aparece aqui."
          : `Quando ${nomePro} concluir um atendimento, a cliente aparece aqui.`,
      }
    : undefined;

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Quem está voltando, o que mais vende e de onde vêm suas clientes." />

      <Card className="mb-4 overflow-hidden">
        <Link
          href={fechamentoHref({ prof: profUrl })}
          className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-muted"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
            <IconFile width={18} height={18} />
          </span>
          <span className="min-w-0 grow">
            <span className="block text-[15px] font-semibold text-ink">Fechamento do mês</span>
            <span className="block text-[13px] text-ink-soft">
              {!pro
                ? "Relatório completo em PDF, com a sua identidade"
                : pro.isOwner
                  ? "Seus atendimentos e indicadores do mês em PDF"
                  : `Comissão de ${nomePro} com recibo, em PDF`}
            </span>
          </span>
          <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
        </Link>
      </Card>

      <div id="filtros" className="scroll-mt-4 space-y-3">
        <PeriodoSwitch periodo={periodo} prof={profUrl} />
        {comEquipe ? <ProFilter options={opcoes} /> : null}
      </div>

      <div className="mt-6 space-y-7">
        {pro && indicadoresDaPro ? (
          <ReportSection
            title={pro.isOwner ? "Seus indicadores" : `Indicadores de ${nomePro}`}
            subtitle={pro.ativa ? periodoLabel : `${periodoLabel} · desativada`}
          >
            <IndicadoresCards
              itens={itensDosIndicadores(indicadoresDaPro, {
                quem: pro.isOwner ? "voce" : "ela",
                recorte: "período",
              })}
            />
          </ReportSection>
        ) : null}

        {equipe.length > 0 ? (
          <ReportSection title="Equipe" subtitle={periodoLabel}>
            <EquipeIndicadores linhas={equipe} />
          </ReportSection>
        ) : null}

        <ReportSection title="Clientes por status" subtitle={clientesDela}>
          <StatusGroups groups={data.statusGroups} vazio={vazioDeClientes} />
        </ReportSection>

        <ReportSection
          title="Ranking LTV"
          subtitle={
            pro
              ? `${pro.isOwner ? "seus atendimentos" : `atendimentos de ${nomePro}`} · todo o histórico`
              : "todo o histórico"
          }
        >
          <LtvRanking
            items={data.ltv}
            vazio={
              pro
                ? {
                    title: "Nenhuma receita registrada",
                    description: pro.isOwner
                      ? "Registre os pagamentos dos seus atendimentos para ver suas melhores clientes."
                      : `Registre os pagamentos dos atendimentos de ${nomePro} para ver as melhores clientes dela.`,
                  }
                : undefined
            }
          />
        </ReportSection>

        <ReportSection title="Serviços mais vendidos" subtitle={periodoLabel}>
          <ServicosChart items={data.servicos} />
        </ReportSection>

        <ReportSection title="Dias e horários mais procurados" subtitle={periodoLabel}>
          <DemandaChart demanda={data.demanda} />
        </ReportSection>

        <ReportSection title="Origem das clientes" subtitle={clientesDela}>
          <OrigensChart origens={data.origens} insight={data.origemInsight} vazio={vazioDeClientes} />
        </ReportSection>
      </div>
    </>
  );
}
