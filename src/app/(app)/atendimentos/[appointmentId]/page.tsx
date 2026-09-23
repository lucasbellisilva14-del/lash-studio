import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { formatDate, formatDateLong, formatDateTime, formatTime, localDayKey } from "@/lib/dates";
import {
  MAPPING_MAX_MM,
  MAPPING_MIN_MM,
  PAYMENT_METHODS,
  SERVICE_CATEGORIES,
  parseMapping,
  type AppointmentStatus,
  type PaymentMethod,
  type ServiceCategory,
} from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { AppointmentStatusBadge, Badge } from "@/components/ui/badge";
import {
  IconAlert,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconScissors,
} from "@/components/ui/icons";
import { FichaForm, type FichaInitial } from "@/components/atendimento/ficha-form";
import { PhotosSection } from "@/components/atendimento/photos-section";
import { PaymentForm } from "@/components/atendimento/payment-form";

export const metadata = { title: "Ficha técnica" };

const clampMm = (v: number) =>
  Math.min(MAPPING_MAX_MM, Math.max(MAPPING_MIN_MM, Math.round(v) || MAPPING_MIN_MM));

export default async function AtendimentoPage(
  props: PageProps<"/atendimentos/[appointmentId]">,
) {
  const professional = await requireProfessional();
  const { appointmentId } = await props.params;
  const tz = professional.timezone;

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, professionalId: professional.id },
    include: {
      client: { include: { anamnesisForm: { select: { hasContraindication: true } } } },
      service: true,
      attendanceRecord: {
        include: { photos: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!appointment) notFound();

  const [lastRecord, glueRows, transaction, fees] = await Promise.all([
    prisma.attendanceRecord.findFirst({
      where: {
        professionalId: professional.id,
        clientId: appointment.clientId,
        appointmentId: { not: appointment.id },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        professionalId: professional.id,
        OR: [{ glueBrand: { not: null } }, { glueBatch: { not: null } }],
      },
      select: { glueBrand: true, glueBatch: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.transaction.findFirst({
      where: {
        professionalId: professional.id,
        appointmentId: appointment.id,
        type: "RECEITA",
        kind: "ATENDIMENTO",
      },
    }),
    prisma.paymentMethodFee.findMany({
      where: { professionalId: professional.id },
    }),
  ]);

  // Ficha vazia? Pré-carrega técnica/fios/mapping/cola do último atendimento.
  const record = appointment.attendanceRecord;
  const recordEmpty =
    !record ||
    (!record.technique &&
      !record.curvatures &&
      !record.thickness &&
      !record.mappingJson &&
      !record.glueBrand &&
      !record.glueBatch);
  const prefillSource = recordEmpty && lastRecord ? lastRecord : record;
  const prefilled = Boolean(recordEmpty && lastRecord);

  const mapping = parseMapping(prefillSource?.mappingJson);
  const initial: FichaInitial = {
    technique: prefillSource?.technique ?? null,
    volumeFactor: prefillSource?.volumeFactor ?? null,
    curvatures: prefillSource?.curvatures
      ? prefillSource.curvatures.split(",").map((c) => c.trim()).filter(Boolean)
      : [],
    thickness: prefillSource?.thickness ?? null,
    zones: (mapping?.zones ?? [8, 9, 11, 10, 9]).map(clampMm),
    glueBrand: prefillSource?.glueBrand ?? "",
    glueBatch: prefillSource?.glueBatch ?? "",
    // Estes nunca vêm do atendimento anterior:
    retentionPct: record?.retentionPct ?? null,
    durationMin: record?.durationMin ?? null,
    notes: record?.notes ?? "",
  };

  const glueBrands = [...new Set(glueRows.map((r) => r.glueBrand).filter((b): b is string => Boolean(b)))];
  const glueBatches = [...new Set(glueRows.map((r) => r.glueBatch).filter((b): b is string => Boolean(b)))];

  const feeByMethod = Object.fromEntries(fees.map((f) => [f.method, f.feePct]));
  const depositPaidCents =
    appointment.depositPaidAt && appointment.depositCents ? appointment.depositCents : null;

  const category = appointment.service.category as ServiceCategory;
  const hasContraindication = Boolean(appointment.client.anamnesisForm?.hasContraindication);

  return (
    <div>
      <PageHeader
        title="Ficha técnica"
        subtitle={formatDateLong(appointment.startAt, tz)}
        backHref={`/agenda?dia=${localDayKey(appointment.startAt, tz)}`}
      />

      {hasContraindication ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <IconAlert width={18} height={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Cliente com contraindicação</p>
            <p className="mt-0.5">
              A anamnese desta cliente indica contraindicação — confira antes de aplicar.{" "}
              <Link
                href={`/clientes/${appointment.clientId}`}
                className="font-medium underline underline-offset-2"
              >
                Ver ficha da cliente
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardBody className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/clientes/${appointment.clientId}`}
              className="group flex items-center gap-1 min-w-0"
            >
              <p className="font-display text-lg font-semibold text-ink truncate group-active:text-accent-strong">
                {appointment.client.name}
              </p>
              <IconChevronRight width={16} height={16} className="text-ink-faint shrink-0" />
            </Link>
            <AppointmentStatusBadge status={appointment.status as AppointmentStatus} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <IconScissors width={15} height={15} className="text-ink-faint" />
              {appointment.service.name}
              <span className="text-ink-faint">· {SERVICE_CATEGORIES[category] ?? category}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCalendar width={15} height={15} className="text-ink-faint" />
              {formatDate(appointment.startAt, tz)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconClock width={15} height={15} className="text-ink-faint" />
              {formatTime(appointment.startAt, tz)}–{formatTime(appointment.endAt, tz)}
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <FichaForm
          appointmentId={appointment.id}
          initial={initial}
          prefilled={prefilled}
          isMaintenance={category === "MANUTENCAO"}
          serviceDurationMin={appointment.service.durationMin}
          glueBrands={glueBrands}
          glueBatches={glueBatches}
        />

        <PhotosSection
          appointmentId={appointment.id}
          photos={(record?.photos ?? []).map((p) => ({
            id: p.id,
            kind: p.kind,
            storageKey: p.storageKey,
            thumbKey: p.thumbKey,
          }))}
        />

        {transaction ? (
          <PaymentSummary
            amountCents={transaction.amountCents}
            method={transaction.method}
            installments={transaction.installments}
            feePct={transaction.feePct}
            feeCents={transaction.feeCents}
            netCents={transaction.netCents}
            dateLabel={formatDateTime(transaction.date, tz)}
          />
        ) : (
          <PaymentForm
            appointmentId={appointment.id}
            defaultAmountCents={Math.max(0, appointment.priceCents - (depositPaidCents ?? 0))}
            depositPaidCents={depositPaidCents}
            fees={feeByMethod}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PaymentSummary({
  amountCents,
  method,
  installments,
  feePct,
  feeCents,
  netCents,
  dateLabel,
}: {
  amountCents: number;
  method: string | null;
  installments: number | null;
  feePct: number;
  feeCents: number;
  netCents: number;
  dateLabel: string;
}) {
  const methodLabel =
    method && method in PAYMENT_METHODS
      ? PAYMENT_METHODS[method as PaymentMethod]
      : (method ?? "—");

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Pagamento</h2>
          <Badge tone="success">
            <IconCheck width={13} height={13} />
            Recebido
          </Badge>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Valor</dt>
            <dd className="font-medium text-ink">{formatBRL(amountCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Forma</dt>
            <dd className="font-medium text-ink">
              {methodLabel}
              {installments ? ` · ${installments}x` : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">
              Taxa{feePct > 0 ? ` (${feePct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)` : ""}
            </dt>
            <dd className="font-medium text-ink">
              {feeCents > 0 ? `− ${formatBRL(feeCents)}` : formatBRL(0)}
            </dd>
          </div>
          <div className="flex justify-between items-baseline border-t border-line pt-2">
            <dt className="font-medium text-ink">Líquido</dt>
            <dd className="font-display text-lg font-semibold text-accent-strong">
              {formatBRL(netCents)}
            </dd>
          </div>
          <div className="flex justify-between pt-0.5">
            <dt className="text-ink-faint text-xs">Registrado em</dt>
            <dd className="text-ink-faint text-xs">{dateLabel}</dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}
