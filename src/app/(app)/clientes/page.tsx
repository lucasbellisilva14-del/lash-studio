import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { LASH_CYCLE_CATEGORIES } from "@/lib/constants";
import { computeClientCycle } from "@/lib/domain/client-status";
import { PageHeader } from "@/components/ui/page-header";
import { ClientsList, type ClientRow } from "./clients-list";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const professional = await requireProfessional();

  const [clients, lastLashRows] = await Promise.all([
    prisma.client.findMany({
      where: { professionalId: professional.id },
      orderBy: { name: "asc" },
      include: { anamnesisForm: { select: { hasContraindication: true } } },
    }),
    // Último atendimento CONCLUÍDO de cílios por cliente, numa única query
    // agregada (distinct + orderBy desc → 1ª linha de cada cliente é a mais recente).
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        status: "CONCLUIDO",
        service: { category: { in: [...LASH_CYCLE_CATEGORIES] } },
      },
      orderBy: { startAt: "desc" },
      distinct: ["clientId"],
      select: { clientId: true, startAt: true },
    }),
  ]);

  const lastLashByClient = new Map(lastLashRows.map((r) => [r.clientId, r.startAt]));
  const settings = {
    maintenanceLimitDays: professional.maintenanceLimitDays,
    inactiveDays: professional.inactiveDays,
    timezone: professional.timezone,
  };
  const now = new Date();

  const rows: ClientRow[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    status: computeClientCycle(lastLashByClient.get(client.id) ?? null, settings, now).status,
    hasContraindication: client.anamnesisForm?.hasContraindication ?? false,
  }));

  const subtitle =
    rows.length === 0
      ? "Nenhuma cliente cadastrada ainda"
      : rows.length === 1
        ? "1 cliente cadastrada"
        : `${rows.length} clientes cadastradas`;

  return (
    <>
      <PageHeader title="Clientes" subtitle={subtitle} />
      <ClientsList clients={rows} />
    </>
  );
}
