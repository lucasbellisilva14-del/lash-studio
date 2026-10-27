import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { ServicosView } from "@/components/servicos/servicos-view";
import type { ServiceItem } from "@/components/servicos/types";

export const metadata = { title: "Serviços" };

export default async function ServicosPage() {
  const { professionalId } = await requireOwner();

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
    returnDays: s.returnDays,
    active: s.active,
  }));

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle="Preço, duração, sinal e retorno ideal de cada serviço."
      />
      <ServicosView services={items} />
    </>
  );
}
