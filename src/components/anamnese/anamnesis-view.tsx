/**
 * Anamnese preenchida, só leitura. As perguntas saem do retrato do dia
 * (questionsSnapshotJson); sem retrato (respondida antes da personalização),
 * do modelo padrão, que tem os mesmos ids do formulário antigo. Mostra o
 * alerta de contraindicação, as respostas ("sim" com alerta em vermelho),
 * respostas soltas de formatos antigos, fios naturais, LGPD e assinaturas.
 * Server component: recebe os campos do registro como estão no banco.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  anamnesisQuestionsOrDefault,
  readAnamnesisAnswers,
  type AnamnesisAnswer,
  type AnamnesisQuestion,
} from "@/lib/domain/anamnesis-model";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { IconAlert, IconCheck, IconEdit } from "@/components/ui/icons";
import {
  contraindicationLabels,
  parseContraindicationFlags,
} from "@/components/clientes/contraindications";

export type SignatureItem = { id: string; imageKey: string; signedAt: Date };

export function AnamnesisView({
  clientId,
  clientName,
  answersJson,
  questionsSnapshotJson,
  contraindicationFlags,
  hasContraindication,
  naturalLashCondition,
  lgpdConsent,
  updatedAt,
  signatures,
  tz,
}: {
  clientId: string;
  clientName: string;
  answersJson: string;
  /** Perguntas como foram feitas no dia; nulo = respondida no modelo antigo. */
  questionsSnapshotJson: string | null;
  contraindicationFlags: string;
  hasContraindication: boolean;
  naturalLashCondition: string | null;
  lgpdConsent: boolean;
  updatedAt: Date;
  /** Mais recente primeiro. */
  signatures: SignatureItem[];
  tz: string;
}) {
  const questions = anamnesisQuestionsOrDefault(questionsSnapshotJson);
  const flags = parseContraindicationFlags(contraindicationFlags);
  const { answers, extras } = readAnamnesisAnswers(answersJson, questions, flags);
  const alertLabels = contraindicationLabels(flags, questions);

  const latestSignature = signatures[0] ?? null;
  const olderSignatures = signatures.slice(1);

  const conditionLabel = naturalLashCondition
    ? ((NATURAL_LASH_CONDITIONS as Record<string, string>)[naturalLashCondition] ??
      naturalLashCondition)
    : null;

  return (
    <div className="space-y-4">
      {/* Alerta de contraindicação */}
      {hasContraindication ? (
        <div className="flex gap-3 rounded-[22px] bg-danger-soft px-4 py-4 text-danger sm:px-5">
          <IconAlert width={20} height={20} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-[-0.01em]">Contraindicações encontradas</p>
            {alertLabels.length > 0 ? (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[14px] leading-snug">
                {alertLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[14px] leading-snug">Confira as respostas antes de atender.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* Respostas */}
      <Card>
        <CardHeader title="Respostas" description={`Preenchida em ${formatDate(updatedAt, tz)}`} />
        <ul className="divide-y divide-line px-4 sm:px-5">
          {questions.map((question) => (
            <AnswerRow key={question.id} question={question} answer={answers[question.id]} />
          ))}
        </ul>
      </Card>

      {/* Respostas gravadas fora das perguntas (formatos antigos): nada some. */}
      {extras.length > 0 ? (
        <Card>
          <CardHeader
            title="Outras respostas registradas"
            description="Gravadas num formato antigo da anamnese."
          />
          <dl className="divide-y divide-line px-4 sm:px-5">
            {extras.map((extra, index) => (
              <div key={`${extra.label}-${index}`} className="py-3.5">
                <dt className="text-[13.5px] leading-snug text-ink-soft">{extra.label}</dt>
                <dd className="mt-1 whitespace-pre-line text-[14.5px] font-medium leading-snug text-ink">
                  {extra.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {/* Fios naturais + LGPD */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] text-ink-soft">Condição dos fios naturais</p>
            {conditionLabel ? (
              <Badge tone="accent">{conditionLabel}</Badge>
            ) : (
              <span className="text-[14px] text-ink-faint">Não informada</span>
            )}
          </div>
          {lgpdConsent ? (
            <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-success">
              <IconCheck width={15} height={15} className="shrink-0" />
              Armazenamento de dados autorizado (LGPD)
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Assinatura */}
      <Card>
        <CardHeader
          title="Assinatura"
          description={
            latestSignature
              ? `Assinada em ${formatDateTime(latestSignature.signedAt, tz)}`
              : "Nenhuma assinatura registrada."
          }
        />
        {latestSignature ? (
          <CardBody>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${latestSignature.imageKey}`}
              alt={`Assinatura de ${clientName}`}
              className="w-full rounded-[14px] border border-line"
            />
            {olderSignatures.length > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] font-semibold text-ink">Assinaturas anteriores</p>
                <ul className="mt-2.5 space-y-2">
                  {olderSignatures.map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/uploads/${s.imageKey}`}
                        alt="Assinatura anterior"
                        loading="lazy"
                        className="h-10 w-24 rounded-[10px] border border-line bg-surface object-contain"
                      />
                      <p className="text-[13px] text-ink-soft">{formatDateTime(s.signedAt, tz)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        ) : null}
      </Card>

      <Link
        href={`/clientes/${clientId}/anamnese?editar=1`}
        className={buttonClasses("secondary", "lg")}
      >
        <IconEdit width={17} height={17} /> Atualizar anamnese
      </Link>
    </div>
  );
}

function AnswerRow({
  question,
  answer,
}: {
  question: AnamnesisQuestion;
  answer: AnamnesisAnswer | undefined;
}) {
  if (question.type === "SIM_NAO") {
    const sim = answer && "sim" in answer ? answer.sim : null;
    const detalhe = sim && answer && "sim" in answer ? answer.detalhe.trim() : "";
    return (
      <li className="py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "min-w-0 text-[14.5px] leading-snug",
              sim ? "font-semibold text-ink" : "text-ink-soft",
            )}
          >
            {question.text}
          </p>
          <Badge
            tone={sim === null ? "neutral" : sim ? (question.alert ? "danger" : "accent") : "neutral"}
            className="shrink-0"
          >
            {sim === null ? "Sem resposta" : sim ? "Sim" : "Não"}
          </Badge>
        </div>
        {detalhe ? (
          <div className="mt-1.5 text-[13.5px] leading-snug">
            {question.followUp ? <p className="text-ink-faint">{question.followUp}</p> : null}
            <p className="whitespace-pre-line text-ink-soft">{detalhe}</p>
          </div>
        ) : null}
      </li>
    );
  }

  const value =
    answer && "texto" in answer ? answer.texto : answer && "opcao" in answer ? answer.opcao : "";
  return (
    <li className="py-3.5">
      <p className="text-[14.5px] leading-snug text-ink-soft">{question.text}</p>
      {value ? (
        <p className="mt-1 whitespace-pre-line text-[14.5px] font-semibold leading-snug text-ink">
          {value}
        </p>
      ) : (
        <p className="mt-1 text-[13px] text-ink-faint">Sem resposta</p>
      )}
    </li>
  );
}
