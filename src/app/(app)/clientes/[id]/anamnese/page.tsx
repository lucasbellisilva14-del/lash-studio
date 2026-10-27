import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer } from "@/lib/session";
import { clientScope } from "@/lib/team";
import { formatDate } from "@/lib/dates";
import {
  ANAMNESIS_LIMITS,
  anamnesisQuestionsOrDefault,
  readAnamnesisAnswers,
} from "@/lib/domain/anamnesis-model";
import { PageHeader } from "@/components/ui/page-header";
import { AnamnesisForm } from "@/components/anamnese/anamnesis-form";
import { AnamnesisView } from "@/components/anamnese/anamnesis-view";
import { DEFAULT_CONSENT_TEXT } from "@/components/anamnese/questions";
import { parseContraindicationFlags } from "@/components/clientes/contraindications";

export default async function AnamnesePage(props: PageProps<"/clientes/[id]/anamnese">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const tz = professional.timezone;

  // Funcionária: só clientes do escopo dela (cadastrou ou tem/teve horário).
  const client = await prisma.client.findFirst({
    where: { id, professionalId: professional.id, ...clientScope(viewer) },
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

  // Preenchimento: modelo atual da profissional (ou o padrão). Numa
  // atualização, as respostas anteriores entram nas perguntas de mesmo id.
  const questions = editing
    ? anamnesisQuestionsOrDefault(professional.anamnesisQuestionsJson)
    : [];
  const initialAnswers =
    editing && form
      ? readAnamnesisAnswers(
          form.answersJson,
          questions,
          parseContraindicationFlags(form.contraindicationFlags),
        ).answers
      : null;

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
          questions={questions}
          initialAnswers={initialAnswers}
          naturalInitial={form?.naturalLashCondition ?? null}
          hasExistingSignature={signatures.length > 0}
          lastSignedAtLabel={signatures[0] ? formatDate(signatures[0].signedAt, tz) : null}
          canEditModel={viewer.isOwner}
          limits={{
            detail: ANAMNESIS_LIMITS.detail,
            shortAnswer: ANAMNESIS_LIMITS.shortAnswer,
            longAnswer: ANAMNESIS_LIMITS.longAnswer,
          }}
        />
      ) : form ? (
        <AnamnesisView
          clientId={client.id}
          clientName={client.name}
          answersJson={form.answersJson}
          questionsSnapshotJson={form.questionsSnapshotJson}
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
