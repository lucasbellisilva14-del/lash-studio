import type { Metadata } from "next";
import { requireProfessional, requireViewer } from "@/lib/session";
import { PaginaDona } from "./pagina-dona";
import { PaginaFuncionaria } from "./pagina-funcionaria";

/**
 * /financeiro — a dona vê o Financeiro do estúdio (abas ?aba=, mês ?mes=,
 * profissional ?prof=); a funcionária vê "Meus números" (só os dela).
 */
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await requireViewer();
  return { title: viewer.isOwner ? "Financeiro" : "Meus números" };
}

export default async function FinanceiroPage(props: PageProps<"/financeiro">) {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const sp = await props.searchParams;
  const agora = new Date();

  if (viewer.memberId !== null) {
    return (
      <PaginaFuncionaria
        professional={professional}
        viewer={{ ...viewer, memberId: viewer.memberId }}
        sp={sp}
        agora={agora}
      />
    );
  }

  return <PaginaDona professional={professional} viewer={viewer} sp={sp} agora={agora} />;
}
