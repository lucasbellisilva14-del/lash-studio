/**
 * Modo visualização da anamnese preenchida: respostas resumidas ("sim" em
 * destaque, vermelho quando contraindicado), condição dos fios, LGPD e
 * assinatura com histórico. Server component — recebe tudo pronto da página.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";
import { NATURAL_LASH_CONDITIONS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Card, CardBody } from "@/components/ui/card";
import { IconAlert, IconCheck, IconEdit } from "@/components/ui/icons";
import {
  contraindicationLabel,
  parseContraindicationFlags,
} from "@/components/clientes/contraindications";
import {
  ANAMNESIS_QUESTIONS,
  FLAG_ALERGIA_CIANOACRILATO,
  parseAnamnesisAnswers,
} from "./questions";
import { IconSignature } from "./icons";

export type SignatureItem = { id: string; imageKey: string; signedAt: Date };

export function AnamnesisView({
  clientId,
  clientName,
  answersJson,
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
  contraindicationFlags: string;
  hasContraindication: boolean;
  naturalLashCondition: string | null;
  lgpdConsent: boolean;
  updatedAt: Date;
  /** Mais recente primeiro. */
  signatures: SignatureItem[];
  tz: string;
}) {
  const parsed = parseAnamnesisAnswers(answersJson);
  const flags = parseContraindicationFlags(contraindicationFlags);
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
        <Card className="border-danger/40 bg-danger-soft shadow-none">
          <CardBody className="flex gap-3">
            <IconAlert className="text-danger shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-danger">Contraindicações encontradas</p>
              <ul className="mt-1 space-y-0.5">
                {flags.map((flag) => (
                  <li key={flag} className="text-sm text-danger">
                    • {contraindicationLabel(flag)}
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Respostas */}
      <Card>
        <CardBody>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-ink">Respostas</h2>
            <p className="text-xs text-ink-faint shrink-0">
              Preenchida em {formatDate(updatedAt, tz)}
            </p>
          </div>
          <ul className="mt-2">
            {ANAMNESIS_QUESTIONS.map((q, index) => {
              const answer = parsed.respostas[q.id];
              const sim = answer?.sim === true;
              const danger =
                sim &&
                ((q.flag != null && flags.includes(q.flag)) ||
                  (q.id === "alergias" && flags.includes(FLAG_ALERGIA_CIANOACRILATO)));
              return (
                <li
                  key={q.id}
                  className={cn(
                    "py-3",
                    index < ANAMNESIS_QUESTIONS.length - 1 && "border-b border-line",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={cn(
                        "text-sm leading-snug min-w-0",
                        sim ? "font-medium text-ink" : "text-ink-soft",
                      )}
                    >
                      {q.label}
                    </p>
                    <span
                      className={cn(
                        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold shrink-0",
                        answer == null
                          ? "bg-surface-sunken text-ink-faint"
                          : sim
                            ? danger
                              ? "bg-danger-soft text-danger"
                              : "bg-accent-soft text-accent-strong"
                            : "bg-surface-sunken text-ink-faint",
                      )}
                    >
                      {answer == null ? "—" : sim ? "Sim" : "Não"}
                    </span>
                  </div>
                  {sim && q.id === "alergias" && flags.includes(FLAG_ALERGIA_CIANOACRILATO) ? (
                    <p className="mt-1 text-xs font-medium text-danger">
                      Alergia a cianoacrilato (componente da cola)
                    </p>
                  ) : null}
                  {sim && answer?.detalhe ? (
                    <p className="mt-1 text-[13px] text-ink-soft whitespace-pre-line">
                      {answer.detalhe}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {/* Fios naturais + LGPD */}
      <Card>
        <CardBody className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-faint">Condição dos fios naturais</p>
            {conditionLabel ? (
              <span className="inline-flex h-7 items-center rounded-full bg-accent-soft px-3 text-[13px] font-medium text-accent-strong">
                {conditionLabel}
              </span>
            ) : (
              <span className="text-sm text-ink-faint">Não informada</span>
            )}
          </div>
          {lgpdConsent ? (
            <p className="flex items-center gap-1.5 text-[13px] text-success">
              <IconCheck width={14} height={14} className="shrink-0" />
              Armazenamento de dados autorizado (LGPD)
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Assinatura */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2">
            <IconSignature width={17} height={17} className="text-ink-soft" />
            <h2 className="font-display text-base font-semibold text-ink">Assinatura</h2>
          </div>
          {latestSignature ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/uploads/${latestSignature.imageKey}`}
                alt={`Assinatura de ${clientName}`}
                className="mt-3 w-full rounded-xl border border-line"
              />
              <p className="mt-2 text-xs text-ink-faint">
                Assinado em {formatDateTime(latestSignature.signedAt, tz)}
              </p>
              {olderSignatures.length > 0 ? (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">
                    Assinaturas anteriores
                  </p>
                  <ul className="mt-2 space-y-2">
                    {olderSignatures.map((s) => (
                      <li key={s.id} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/uploads/${s.imageKey}`}
                          alt="Assinatura anterior"
                          loading="lazy"
                          className="h-10 w-24 rounded-lg border border-line bg-surface object-contain"
                        />
                        <p className="text-xs text-ink-soft">
                          {formatDateTime(s.signedAt, tz)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-soft mt-2">Nenhuma assinatura registrada.</p>
          )}
        </CardBody>
      </Card>

      <Link
        href={`/clientes/${clientId}/anamnese?editar=1`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium text-ink active:bg-background transition-colors"
      >
        <IconEdit width={17} height={17} /> Atualizar anamnese
      </Link>
    </div>
  );
}
