import { requireProfessional } from "@/lib/session";
import { messageProviderIsAutomatic } from "@/lib/providers/message";
import { PageHeader } from "@/components/ui/page-header";
import { NotificacoesManager } from "@/components/push/notificacoes-manager";
import { ResumoConfig } from "@/components/push/resumo-config";

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
      <div className="space-y-4">
        <NotificacoesManager dailySummaryTime={professional.dailySummaryTime} />
        <ResumoConfig
          dailySummaryTime={professional.dailySummaryTime}
          autoSendMessages={professional.autoSendMessages}
          waAutomaticoDisponivel={messageProviderIsAutomatic()}
        />
      </div>
    </div>
  );
}
