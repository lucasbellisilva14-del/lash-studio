import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer } from "@/lib/session";
import { clientScope } from "@/lib/team";
import { LASH_CYCLE_CATEGORIES } from "@/lib/constants";
import { computeClientCycle } from "@/lib/domain/client-status";
import { PageHeader } from "@/components/ui/page-header";
import { ClientsList, type ClientRow } from "./clients-list";

export const metadata = { title: "Clientes" };

export default async function ClientesPage(props: PageProps<"/clientes">) {
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const sp = await props.searchParams;
  const novaInicial = (Array.isArray(sp.nova) ? sp.nova[0] : sp.nova) === "1";
  // Funcionária: só as clientes que cadastrou ou com quem tem/teve horário.
  const scope = clientScope(viewer);

  const [clients, lastLashRows] = await Promise.all([
    prisma.client.findMany({
      where: { professionalId: professional.id, ...scope },
      orderBy: { name: "asc" },
      include: { anamnesisForm: { select: { hasContraindication: true } } },
    }),
    // Último atendimento CONCLUÍDO de cílios por cliente, numa única query
    // agregada (distinct + orderBy desc → 1ª linha de cada cliente é a mais recente).
    // Vale o ciclo da cliente no estúdio (com qualquer profissional).
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        status: "CONCLUIDO",
        service: { category: { in: [...LASH_CYCLE_CATEGORIES] } },
        ...(viewer.isOwner ? {} : { client: scope }),
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

  const subtitle = viewer.isOwner
    ? rows.length === 0
      ? "Nenhuma cliente cadastrada ainda."
      : `${rows.length === 1 ? "1 cliente cadastrada" : `${rows.length} clientes cadastradas`}. Toque numa cliente para abrir a ficha.`
    : rows.length === 0
      ? "As clientes que você cadastrar ou atender aparecem aqui."
      : `${rows.length === 1 ? "1 cliente" : `${rows.length} clientes`} que você cadastrou ou atende. Toque numa cliente para abrir a ficha.`;

  return (
    <>
      <PageHeader title="Clientes" subtitle={subtitle} />
      <ClientsList clients={rows} novaInicial={novaInicial} />
    </>
  );
}
