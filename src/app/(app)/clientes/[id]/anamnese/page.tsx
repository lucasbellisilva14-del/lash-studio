import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { AnamnesisForm } from "@/components/anamnese/anamnesis-form";
import { AnamnesisView } from "@/components/anamnese/anamnesis-view";
import {
  DEFAULT_CONSENT_TEXT,
  FLAG_ALERGIA_CIANOACRILATO,
  parseAnamnesisAnswers,
} from "@/components/anamnese/questions";
import { parseContraindicationFlags } from "@/components/clientes/contraindications";

export default async function AnamnesePage(props: PageProps<"/clientes/[id]/anamnese">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const professional = await requireProfessional();
  const tz = professional.timezone;

  const client = await prisma.client.findFirst({
    where: { id, professionalId: professional.id },
    include: { anamnesisForm: true },
  });
  if (!client) notFound();

  const form = client.anamnesisForm;
  const signatures = form
    ? await prisma.consentSignature.findMany({
        where: { anamnesisFormId: form.id, professionalId: professional.id },
        orderBy: { signedAt: "desc" },
      })
    : [];

  const editing = !form || Boolean(sp.editar);
  const consentText = professional.consentText?.trim() || DEFAULT_CONSENT_TEXT;

  // Inicial do modo edição; no formato legado a flag de cianoacrilato
  // vem do que foi gravado em contraindicationFlags.
  const parsedInitial = form ? parseAnamnesisAnswers(form.answersJson) : null;
  if (form && parsedInitial && !parsedInitial.alergiaCianoacrilato) {
    parsedInitial.alergiaCianoacrilato = parseContraindicationFlags(
      form.contraindicationFlags,
    ).includes(FLAG_ALERGIA_CIANOACRILATO);
  }

  return (
    <div>
      <PageHeader
        backHref={editing && form ? `/clientes/${client.id}/anamnese` : `/clientes/${client.id}`}
        title="Anamnese"
        subtitle={
          form
            ? `${client.name} · preenchida em ${formatDate(form.updatedAt, tz)}`
            : client.name
        }
      />

      {editing ? (
        <AnamnesisForm
          clientId={client.id}
          clientName={client.name}
          consentText={consentText}
          initial={parsedInitial}
          naturalInitial={form?.naturalLashCondition ?? null}
          hasExistingSignature={signatures.length > 0}
          lastSignedAtLabel={
            signatures[0] ? formatDate(signatures[0].signedAt, tz) : null
          }
        />
      ) : form ? (
        <AnamnesisView
          clientId={client.id}
          clientName={client.name}
          answersJson={form.answersJson}
          contraindicationFlags={form.contraindicationFlags}
          hasContraindication={form.hasContraindication}
          naturalLashCondition={form.naturalLashCondition}
          lgpdConsent={form.lgpdConsent}
          updatedAt={form.updatedAt}
          signatures={signatures.map((s) => ({
            id: s.id,
            imageKey: s.imageKey,
            signedAt: s.signedAt,
          }))}
          tz={tz}
        />
      ) : null}
    </div>
  );
}
