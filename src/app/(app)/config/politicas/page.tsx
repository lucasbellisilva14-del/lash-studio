import { requireProfessional } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { PoliticasForm } from "./politicas-form";

export const metadata = { title: "Políticas de atendimento" };

const DEPOSIT_TYPES = ["PERCENT", "FIXED", "NONE"] as const;
type DepositType = (typeof DEPOSIT_TYPES)[number];

export default async function PoliticasPage() {
  const p = await requireProfessional();

  const depositType: DepositType = DEPOSIT_TYPES.includes(
    p.depositType as DepositType,
  )
    ? (p.depositType as DepositType)
    : "PERCENT";

  return (
    <div>
      <PageHeader
        title="Políticas"
        subtitle="Sinal, cancelamento, manutenção e status"
        backHref="/config"
      />
      <PoliticasForm
        defaults={{
          depositType,
          depositValue: p.depositValue,
          cancellationWindowHours: p.cancellationWindowHours,
          maintenanceLimitDays: p.maintenanceLimitDays,
          maintenanceNoticeDay: p.maintenanceNoticeDay,
          noShowThreshold: p.noShowThreshold,
          riskWindowDays: p.riskWindowDays,
          inactiveDays: p.inactiveDays,
          dailySummaryTime: p.dailySummaryTime,
        }}
      />
    </div>
  );
}
