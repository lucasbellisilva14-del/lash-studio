import type { Metadata } from "next";
import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodoSwitch } from "@/components/relatorios/periodo-switch";
import { ReportSection } from "@/components/relatorios/section";
import { StatusGroups } from "@/components/relatorios/status-groups";
import { LtvRanking } from "@/components/relatorios/ltv-ranking";
import { ServicosChart } from "@/components/relatorios/servicos-chart";
import { DemandaChart } from "@/components/relatorios/demanda-chart";
import { OrigensChart } from "@/components/relatorios/origens-chart";
import { getRelatoriosData, type PeriodoRelatorio } from "./data";

export const metadata: Metadata = { title: "Relatórios" };

const PERIODO_LABELS: Record<PeriodoRelatorio, string> = {
  30: "últimos 30 dias",
  90: "últimos 90 dias",
  365: "últimos 12 meses",
};

function primeiro(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function RelatoriosPage(props: PageProps<"/relatorios">) {
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const raw = primeiro(sp.periodo);
  const periodo: PeriodoRelatorio = raw === "30" ? 30 : raw === "365" ? 365 : 90;

  const data = await getRelatoriosData(professional, periodo);
  const periodoLabel = PERIODO_LABELS[periodo];

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Os números do seu estúdio" />
      <PeriodoSwitch periodo={periodo} />

      <div className="mt-6 space-y-7">
        <ReportSection title="Clientes por status">
          <StatusGroups groups={data.statusGroups} />
        </ReportSection>

        <ReportSection title="Ranking LTV" subtitle="todo o histórico">
          <LtvRanking items={data.ltv} />
        </ReportSection>

        <ReportSection title="Serviços mais vendidos" subtitle={periodoLabel}>
          <ServicosChart items={data.servicos} />
        </ReportSection>

        <ReportSection title="Dias e horários mais procurados" subtitle={periodoLabel}>
          <DemandaChart demanda={data.demanda} />
        </ReportSection>

        <ReportSection title="Origem das clientes">
          <OrigensChart origens={data.origens} insight={data.origemInsight} />
        </ReportSection>
      </div>
    </>
  );
}
