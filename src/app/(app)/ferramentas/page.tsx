import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireOwner, requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { CalculadoraCobranca } from "@/components/ferramentas/calculadora-cobranca";
import { CalculadoraHora } from "@/components/ferramentas/calculadora-hora";
import { Divulgacao } from "@/components/ferramentas/divulgacao";
import { Precificacao } from "@/components/ferramentas/precificacao";
import { PrevisaoEstoque } from "@/components/ferramentas/previsao-estoque";
import { Recibo } from "@/components/ferramentas/recibo";
import { SimuladorMeta } from "@/components/ferramentas/simulador-meta";
import {
  carregarCobranca,
  carregarDivulgacao,
  carregarEstoque,
  carregarHora,
  carregarMeta,
  carregarPreco,
  carregarRecibo,
} from "./data";

export const metadata: Metadata = { title: "Ferramentas" };

type Aba = "cobranca" | "hora" | "preco" | "meta" | "divulgacao" | "recibo" | "estoque";

const ABAS: { key: Aba; label: string; subtitulo: string }[] = [
  { key: "cobranca", label: "Cobrança", subtitulo: "Quanto fica no Pix, no débito e em cada parcela." },
  { key: "hora", label: "Sua hora", subtitulo: "Quanto custa cada hora sua e o lucro real de cada serviço." },
  { key: "preco", label: "Precificação", subtitulo: "O preço mínimo e o sugerido para a margem que você quer." },
  { key: "meta", label: "Meta", subtitulo: "Quantos atendimentos e clientes a sua meta do mês pede." },
  { key: "divulgacao", label: "Divulgação", subtitulo: "QR code, texto da bio e respostas prontas de WhatsApp." },
  { key: "recibo", label: "Recibo", subtitulo: "Uma imagem bonita do atendimento para mandar à cliente." },
  { key: "estoque", label: "Previsão", subtitulo: "O que acaba ou vence primeiro no Estoque e até quando comprar." },
];

function lerAba(pedida: string | string[] | undefined): Aba {
  const chave = Array.isArray(pedida) ? pedida[0] : pedida;
  return ABAS.some((aba) => aba.key === chave) ? (chave as Aba) : "cobranca";
}

/**
 * Ferramentas do estúdio, uma por aba (?aba=). Os dados saem do servidor;
 * as contas rodam no aparelho onde há interação.
 */
export default async function FerramentasPage(props: PageProps<"/ferramentas">) {
  await requireOwner();
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const aba = lerAba(sp.aba);
  const atual = ABAS.find((a) => a.key === aba) ?? ABAS[0];

  let conteudo: ReactNode;
  switch (aba) {
    case "hora":
      conteudo = <CalculadoraHora dados={await carregarHora(professional)} />;
      break;
    case "preco":
      conteudo = <Precificacao dados={await carregarPreco(professional)} />;
      break;
    case "meta":
      conteudo = <SimuladorMeta dados={await carregarMeta(professional)} />;
      break;
    case "divulgacao":
      conteudo = <Divulgacao dados={await carregarDivulgacao(professional)} />;
      break;
    case "recibo":
      conteudo = <Recibo dados={await carregarRecibo(professional)} />;
      break;
    case "estoque":
      conteudo = (
        <PrevisaoEstoque dados={await carregarEstoque(professional)} tz={professional.timezone} />
      );
      break;
    default:
      conteudo = <CalculadoraCobranca dados={await carregarCobranca(professional.id)} />;
  }

  return (
    <div>
      <PageHeader title="Ferramentas" subtitle={atual.subtitulo} />
      <Tabs
        items={ABAS.map((a) => ({ key: a.key, label: a.label, href: `/ferramentas?aba=${a.key}` }))}
        value={aba}
        ariaLabel="Ferramentas"
        className="mb-5"
      />
      <div role="tabpanel" aria-label={atual.label}>
        {conteudo}
      </div>
    </div>
  );
}
