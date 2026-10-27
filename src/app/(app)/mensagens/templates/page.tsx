import { addDays } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import {
  TemplatesManager,
  type TemplateRow,
} from "@/components/mensagens/templates-manager";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireProfessional } from "@/lib/session";
import { localDayKey, localToUtc } from "@/lib/dates";
import { TEMPLATE_KINDS, type TemplateKind } from "@/lib/constants";
import { getBookingUrl } from "@/lib/domain/queue";

export const metadata = { title: "Modelos de mensagem" };

export default async function TemplatesPage() {
  // Modelos de mensagem são do estúdio: só a dona edita (funcionária volta para o início).
  await requireOwner();
  const professional = await requireProfessional();
  const tz = professional.timezone;

  const [templates, bookingUrl] = await Promise.all([
    prisma.messageTemplate.findMany({
      where: { professionalId: professional.id },
    }),
    getBookingUrl(professional.slug),
  ]);
  const byKind = new Map(templates.map((t) => [t.kind as TemplateKind, t]));

  const rows: TemplateRow[] = (Object.keys(TEMPLATE_KINDS) as TemplateKind[]).map(
    (kind) => {
      const template = byKind.get(kind);
      return {
        kind,
        kindLabel: TEMPLATE_KINDS[kind],
        name: template?.name ?? TEMPLATE_KINDS[kind],
        body: template?.body ?? "",
        active: template?.active ?? false,
        exists: Boolean(template),
      };
    },
  );

  // Dados de exemplo da prévia: amanhã às 14:00 no fuso da profissional.
  const sampleStartAt = localToUtc(localDayKey(addDays(new Date(), 1), tz), "14:00", tz);

  return (
    <>
      <PageHeader
        title="Modelos de mensagem"
        subtitle="O texto de cada mensagem da Fila. As variáveis entram com os dados de cada cliente."
        backHref="/mensagens"
      />
      <TemplatesManager
        templates={rows}
        example={{
          studioName: professional.studioName,
          addressLine: professional.addressLine,
          mapsUrl: professional.mapsUrl,
          pixKey: professional.pixKey,
          timezone: tz,
          sampleStartAtIso: sampleStartAt.toISOString(),
          bookingUrl,
        }}
      />
    </>
  );
}
