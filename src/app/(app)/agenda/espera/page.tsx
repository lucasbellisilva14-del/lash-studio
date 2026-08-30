import type { Metadata } from "next";
import { requireProfessional } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { WaitlistManager, type EsperaItem } from "@/components/agenda/waitlist-manager";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Lista de espera" };

export default async function EsperaPage() {
  const professional = await requireProfessional();
  const tz = professional.timezone;

  const [entradas, clientes, servicos] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where: { professionalId: professional.id, status: "ATIVA" },
      orderBy: { createdAt: "asc" },
      include: {
        client: { select: { name: true, phone: true } },
      },
    }),
    prisma.client.findMany({
      where: { professionalId: professional.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { professionalId: professional.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const servicoPorId = new Map(servicos.map((s) => [s.id, s.name]));
  const nomesServicosFaltantes = entradas
    .map((e) => e.serviceId)
    .filter((id): id is string => !!id && !servicoPorId.has(id));
  if (nomesServicosFaltantes.length > 0) {
    const extras = await prisma.service.findMany({
      where: { professionalId: professional.id, id: { in: nomesServicosFaltantes } },
      select: { id: true, name: true },
    });
    for (const s of extras) servicoPorId.set(s.id, s.name);
  }

  const itens: EsperaItem[] = entradas.map((e) => {
    let periodo: string | null = null;
    const de = e.dateFrom ? formatDate(e.dateFrom, tz) : null;
    const ate = e.dateTo ? formatDate(e.dateTo, tz) : null;
    if (de && ate) periodo = `${de} a ${ate}`;
    else if (de) periodo = `a partir de ${de}`;
    else if (ate) periodo = `até ${ate}`;
    return {
      id: e.id,
      clienteNome: e.client.name,
      clienteTelefone: e.client.phone,
      servicoNome: e.serviceId ? servicoPorId.get(e.serviceId) ?? null : null,
      periodo,
      nota: e.periodNote,
      criadaEm: formatDate(e.createdAt, tz),
    };
  });

  return (
    <div>
      <PageHeader
        title="Lista de espera"
        subtitle="Clientes esperando um horário vagar"
        backHref="/agenda"
      />
      <WaitlistManager itens={itens} clientes={clientes} servicos={servicos} />
    </div>
  );
}
