import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { ServicosView } from "@/components/servicos/servicos-view";
import type { ServiceItem } from "@/components/servicos/types";

export const metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const professionalId = await requireProfessionalId();

  const services = await prisma.service.findMany({
    where: { professionalId },
    orderBy: { name: "asc" },
    include: { maintenanceOf: { select: { name: true } } },
  });

  const items: ServiceItem[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    category: (s.category in SERVICE_CATEGORIES ? s.category : "OUTRO") as ServiceCategory,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    requiresDeposit: s.requiresDeposit,
    maintenanceOfId: s.maintenanceOfId,
    maintenanceOfName: s.maintenanceOf?.name ?? null,
    active: s.active,
  }));

  const activeCount = items.filter((i) => i.active).length;

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle={
          activeCount === 1 ? "1 serviço ativo" : `${activeCount} serviços ativos`
        }
      />
      <ServicosView services={items} />
    </>
  );
}
