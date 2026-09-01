import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { NotificacoesManager } from "@/components/push/notificacoes-manager";

export const metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const professional = await requireProfessional();

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle="Resumo diário e avisos direto no seu celular"
        backHref="/config"
      />
      <NotificacoesManager dailySummaryTime={professional.dailySummaryTime} />
    </div>
  );
}
