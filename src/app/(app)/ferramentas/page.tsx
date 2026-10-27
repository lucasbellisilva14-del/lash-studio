import type { Metadata } from "next";
import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { CalculadoraCobranca } from "@/components/ferramentas/calculadora-cobranca";
import { CalculadoraHora } from "@/components/ferramentas/calculadora-hora";
import { carregarCobranca, carregarHora } from "./data";

export const metadata: Metadata = { title: "Ferramentas" };

type Aba = "cobranca" | "hora";

const ABAS = [
  { key: "cobranca", label: "Cobrança", href: "/ferramentas?aba=cobranca" },
  { key: "hora", label: "Sua hora", href: "/ferramentas?aba=hora" },
];

/**
 * Ferramentas: calculadora de cobrança (?aba=cobranca, padrão) e quanto vale
 * a hora dela (?aba=hora). Os dados saem do servidor; as contas, do aparelho.
 */
export default async function FerramentasPage(props: PageProps<"/ferramentas">) {
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const pedida = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba;
  const aba: Aba = pedida === "hora" ? "hora" : "cobranca";

  const conteudo =
    aba === "hora" ? (
      <CalculadoraHora dados={await carregarHora(professional)} />
    ) : (
      <CalculadoraCobranca dados={await carregarCobranca(professional.id)} />
    );

  return (
    <div>
      <PageHeader title="Ferramentas" subtitle="Contas rápidas do dia a dia do estúdio." />
      <Tabs items={ABAS} value={aba} ariaLabel="Ferramentas" className="mb-5" />
      <div role="tabpanel" aria-label={aba === "hora" ? "Sua hora" : "Cobrança"}>
        {conteudo}
      </div>
    </div>
  );
}
