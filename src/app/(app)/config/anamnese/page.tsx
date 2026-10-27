import { requireOwner, requireProfessional } from "@/lib/session";
import {
  ANAMNESIS_LIMITS,
  LEGACY_FLAGS,
  getDefaultAnamnesisModel,
  parseAnamnesisQuestions,
} from "@/lib/domain/anamnesis-model";
import { PageHeader } from "@/components/ui/page-header";
import { contraindicationLabel } from "@/components/clientes/contraindications";
import { AnamnesisModelEditor } from "@/components/anamnese/model-editor";

export const metadata = { title: "Anamnese" };

export default async function AnamneseConfigPage() {
  await requireOwner();
  const professional = await requireProfessional();

  // Nulo (ou ilegível) = a profissional segue o modelo padrão do LashOS.
  const custom = parseAnamnesisQuestions(professional.anamnesisQuestionsJson);

  // Perguntas do formulário antigo mantêm o rótulo fixo no alerta.
  const legacyAlertLabels = Object.fromEntries(
    [...LEGACY_FLAGS].map(([id, flag]) => [id, contraindicationLabel(flag)]),
  );

  return (
    <div>
      <PageHeader
        backHref="/config"
        title="Anamnese"
        subtitle="As perguntas de saúde que você faz antes do atendimento. Você escolhe o que perguntar e o que vira alerta."
      />
      <AnamnesisModelEditor
        initialQuestions={custom ?? getDefaultAnamnesisModel()}
        initialUsingDefault={!custom}
        legacyAlertLabels={legacyAlertLabels}
        limits={{
          maxQuestions: ANAMNESIS_LIMITS.maxQuestions,
          questionText: ANAMNESIS_LIMITS.questionText,
          followUp: ANAMNESIS_LIMITS.followUp,
          option: ANAMNESIS_LIMITS.option,
          maxOptions: ANAMNESIS_LIMITS.maxOptions,
        }}
      />
    </div>
  );
}
