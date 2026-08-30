import { addDays } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import {
  TemplatesManager,
  type TemplateRow,
} from "@/components/mensagens/templates-manager";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { localDayKey, localToUtc } from "@/lib/dates";
import { TEMPLATE_KINDS, type TemplateKind } from "@/lib/constants";

export const metadata = { title: "Templates de mensagem" };

export default async function TemplatesPage() {
  const professional = await requireProfessional();
  const tz = professional.timezone;

  const templates = await prisma.messageTemplate.findMany({
    where: { professionalId: professional.id },
  });
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
        title="Templates"
        subtitle="As mensagens automáticas da sua fila"
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
        }}
      />
    </>
  );
}
