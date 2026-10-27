import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer } from "@/lib/session";
import { canActOnAppointment, clientScope } from "@/lib/team";
import { cn } from "@/lib/cn";
import {
  APPOINTMENT_STATUSES,
  CLIENT_SOURCES,
  LASH_CYCLE_CATEGORIES,
  TEMPLATE_KINDS,
  type AppointmentStatus,
  type ServiceCategory,
} from "@/lib/constants";
import { computeClientCycle } from "@/lib/domain/client-status";
import {
  formatDate,
  formatDateTime,
  formatWithPattern,
  localDayKey,
} from "@/lib/dates";
import { formatPhone, waLink } from "@/lib/phone";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { AppointmentStatusBadge, ClientStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconAlert,
  IconCalendar,
  IconCamera,
  IconChat,
  IconChevronRight,
  IconClock,
  IconWhatsApp,
} from "@/components/ui/icons";
import { IconDownload, IconShield } from "@/components/clientes/icons";
import { IconClipboard } from "@/components/anamnese/icons";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { EditClientButton } from "@/components/clientes/edit-client-button";
import { DeleteClientData } from "@/components/clientes/delete-client-data";
import { ExpandableText } from "@/components/clientes/expandable-text";
import {
  contraindicationLabel,
  parseContraindicationFlags,
} from "@/components/clientes/contraindications";
import {
  FichaResumo,
  fichaTemConteudo,
  type FichaResumoData,
} from "@/components/clientes/ficha-resumo";
import { ProTag, type ProView } from "@/components/home/pro-avatar";
import { getProDirectory, withProView } from "@/components/home/pros";

const PHOTO_KIND_LABELS: Record<string, string> = {
  ANTES: "Antes",
  DEPOIS: "Depois",
  OUTRO: "Foto",
};

const MESSAGE_KIND_LABELS: Record<string, string> = {
  ...TEMPLATE_KINDS,
  LIVRE: "Mensagem avulsa",
};

type TimelineEvent =
  | {
      kind: "atendimento";
      key: string;
      date: Date;
      appointmentId: string;
      serviceName: string;
      status: AppointmentStatus;
      /** Com equipe: com quem foi. */
      pro: ProView | null;
      /** Abre a ficha técnica (dona sempre; funcionária só nos horários dela). */
      canOpen: boolean;
      /** Ficha em leitura quando não dá para abrir (atendimento de outra profissional). */
      ficha: FichaResumoData | null;
    }
  | {
      kind: "fotos";
      key: string;
      date: Date;
      photos: { id: string; storageKey: string; photoKind: string }[];
      /** Com equipe: com quem foi, quando todas as fotos do dia são do mesmo atendimento. */
      pro: ProView | null;
    }
  | {
      kind: "mensagem";
      key: string;
      date: Date;
      label: string;
      body: string;
    };

export default async function ClientProfilePage(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const [viewer, professional] = await Promise.all([requireViewer(), requireProfessional()]);
  const tz = professional.timezone;

  // Funcionária: só clientes do escopo dela. Dentro dele, vê o histórico
  // completo (inclusive com outras profissionais: precisa das fichas
  // anteriores para a manutenção).
  const [client, pros] = await Promise.all([
    prisma.client.findFirst({
      where: { id, professionalId: professional.id, ...clientScope(viewer) },
      include: {
        anamnesisForm: true,
        appointments: {
          include: { service: true, attendanceRecord: true },
          orderBy: { startAt: "desc" },
        },
        photos: {
          orderBy: { createdAt: "desc" },
          include: {
            attendanceRecord: { select: { appointment: { select: { memberId: true } } } },
          },
        },
        messageLogs: { orderBy: { createdAt: "desc" } },
      },
    }),
    getProDirectory(professional.id),
  ]);
  if (!client) notFound();
  const proOf = (memberId: string | null) =>
    pros.hasTeam ? withProView(pros.of(memberId), viewer.memberId) : null;

  // ── Ciclo (appointments já carregados, mais recente primeiro) ──
  const lastLash = client.appointments.find(
    (a) =>
      a.status === "CONCLUIDO" &&
      LASH_CYCLE_CATEGORIES.includes(a.service.category as ServiceCategory),
  );
  const cycle = computeClientCycle(lastLash?.startAt ?? null, {
    maintenanceLimitDays: professional.maintenanceLimitDays,
    inactiveDays: professional.inactiveDays,
    timezone: tz,
  });

  // ── Alerta de contraindicação ──
  const hasContraindication = client.anamnesisForm?.hasContraindication ?? false;
  const contraindications = hasContraindication
    ? parseContraindicationFlags(client.anamnesisForm?.contraindicationFlags).map(
        contraindicationLabel,
      )
    : [];

  // ── Linha do tempo unificada ──
  const events: TimelineEvent[] = [];

  for (const a of client.appointments) {
    const canOpen = canActOnAppointment(viewer, a);
    events.push({
      kind: "atendimento",
      key: `apt-${a.id}`,
      date: a.startAt,
      appointmentId: a.id,
      serviceName: a.service.name,
      status: (a.status in APPOINTMENT_STATUSES
        ? a.status
        : "CONFIRMADO") as AppointmentStatus,
      pro: proOf(a.memberId),
      canOpen,
      ficha:
        !canOpen && a.attendanceRecord && fichaTemConteudo(a.attendanceRecord)
          ? a.attendanceRecord
          : null,
    });
  }

  // memberId do atendimento de cada foto; undefined = foto sem ficha ligada.
  const photosByDay = new Map<
    string,
    {
      date: Date;
      photos: { id: string; storageKey: string; photoKind: string }[];
      memberIds: Set<string | null | undefined>;
    }
  >();
  for (const p of client.photos) {
    const dayKey = localDayKey(p.createdAt, tz);
    const group = photosByDay.get(dayKey);
    const item = { id: p.id, storageKey: p.storageKey, photoKind: p.kind };
    const memberId = p.attendanceRecord?.appointment.memberId;
    if (group) {
      group.photos.push(item);
      group.memberIds.add(memberId);
      if (p.createdAt > group.date) group.date = p.createdAt;
    } else {
      photosByDay.set(dayKey, { date: p.createdAt, photos: [item], memberIds: new Set([memberId]) });
    }
  }
  for (const [dayKey, group] of photosByDay) {
    const [onlyMember] = group.memberIds;
    events.push({
      kind: "fotos",
      key: `fotos-${dayKey}`,
      date: group.date,
      photos: group.photos,
      pro: group.memberIds.size === 1 && onlyMember !== undefined ? proOf(onlyMember) : null,
    });
  }

  for (const m of client.messageLogs) {
    events.push({
      kind: "mensagem",
      key: `msg-${m.id}`,
      date: m.sentAt ?? m.createdAt,
      label: MESSAGE_KIND_LABELS[m.kind] ?? "Mensagem",
      body: m.body,
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  // ── Dados p/ o Sheet de edição ──
  const formInitial = {
    id: client.id,
    name: client.name,
    phone: client.phone,
    instagram: client.instagram ?? "",
    birthDate: client.birthDate ? client.birthDate.toISOString().slice(0, 10) : "",
    source: client.source ?? "",
    notes: client.notes ?? "",
  };

  const actionBase =
    "inline-flex h-11 grow basis-0 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors";

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/clientes"
        title={client.name}
        action={<EditClientButton client={formInitial} />}
      />

      {/* Identificação + status */}
      <div className="flex items-center gap-3 -mt-1">
        <ClientAvatar name={client.name} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ClientStatusBadge status={cycle.status} />
            {hasContraindication ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                <span className="w-2 h-2 rounded-full bg-danger" /> Contraindicação
              </span>
            ) : null}
          </div>
          <p className="text-sm text-ink-soft mt-1">{formatPhone(client.phone)}</p>
          {client.instagram ? (
            <p className="text-[13px] text-ink-faint">{client.instagram}</p>
          ) : null}
        </div>
      </div>

      {/* Alerta permanente de contraindicação */}
      {hasContraindication ? (
        <Card className="border-danger/40 bg-danger-soft shadow-none">
          <CardBody className="flex gap-3">
            <IconAlert className="text-danger shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-danger">Contraindicação na anamnese</p>
              {contraindications.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {contraindications.map((label) => (
                    <li key={label} className="text-sm text-danger">
                      • {label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-danger mt-1">
                  Verifique a ficha de anamnese antes de atender.
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Ações rápidas */}
      <div className="flex gap-2">
        <a
          href={waLink(client.phone)}
          target="_blank"
          rel="noreferrer"
          className={cn(actionBase, "bg-success-soft text-success")}
        >
          <IconWhatsApp width={18} height={18} /> WhatsApp
        </a>
        <Link
          href={`/agenda?novo=1&cliente=${client.id}`}
          className={cn(actionBase, "bg-accent text-accent-ink shadow-sm")}
        >
          <IconCalendar width={18} height={18} /> Agendar
        </Link>
      </div>

      {/* Ciclo de cílios */}
      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold tracking-[-0.03em] text-ink">Ciclo de cílios</h2>
          {lastLash && cycle.lastLashAt ? (
            <>
              <p className="text-sm text-ink-soft mt-1">
                Último atendimento:{" "}
                <span className="font-medium text-ink">{lastLash.service.name}</span> em{" "}
                {formatDate(lastLash.startAt, tz)}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-xl bg-surface-sunken px-2 py-2.5 text-center">
                  <p className="text-base font-semibold text-ink">
                    {cycle.daysSinceLast}º dia
                  </p>
                  <p className="text-[11px] text-ink-faint mt-0.5">do ciclo</p>
                </div>
                <div className="rounded-xl bg-surface-sunken px-2 py-2.5 text-center">
                  <p className="text-base font-semibold text-ink">
                    {cycle.maintenanceDueAt
                      ? formatWithPattern(cycle.maintenanceDueAt, "dd/MM", tz)
                      : "—"}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-0.5">manutenção até</p>
                </div>
                <div className="rounded-xl bg-surface-sunken px-2 py-2.5 text-center">
                  {cycle.daysUntilDue != null && cycle.daysUntilDue > 0 ? (
                    <>
                      <p className="text-base font-semibold text-success">
                        {cycle.daysUntilDue} {cycle.daysUntilDue === 1 ? "dia" : "dias"}
                      </p>
                      <p className="text-[11px] text-ink-faint mt-0.5">até vencer</p>
                    </>
                  ) : cycle.daysUntilDue === 0 ? (
                    <>
                      <p className="text-base font-semibold text-warning">Hoje</p>
                      <p className="text-[11px] text-ink-faint mt-0.5">vence o prazo</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-semibold text-danger">
                        {Math.abs(cycle.daysUntilDue ?? 0)}{" "}
                        {Math.abs(cycle.daysUntilDue ?? 0) === 1 ? "dia" : "dias"}
                      </p>
                      <p className="text-[11px] text-ink-faint mt-0.5">vencido há</p>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft mt-1">
              Nenhum atendimento de cílios concluído ainda.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Anamnese */}
      <Link href={`/clientes/${client.id}/anamnese`} className="block">
        <Card className={cn(!client.anamnesisForm && "border-warning/40")}>
          <CardBody className="flex items-center gap-3 py-3.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                client.anamnesisForm
                  ? "bg-surface-sunken text-ink-soft"
                  : "bg-warning-soft text-warning",
              )}
            >
              <IconClipboard width={19} height={19} />
            </span>
            <div className="min-w-0 grow">
              <p className="text-[15px] font-medium text-ink">Anamnese</p>
              {client.anamnesisForm ? (
                <p className="text-xs text-ink-faint mt-0.5">
                  Preenchida em {formatDate(client.anamnesisForm.updatedAt, tz)}
                </p>
              ) : (
                <p className="text-xs font-medium text-warning mt-0.5">
                  Pendente — preencher agora
                </p>
              )}
            </div>
            <IconChevronRight width={18} height={18} className="text-ink-faint shrink-0" />
          </CardBody>
        </Card>
      </Link>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardBody className="py-3 text-center">
            <p
              className={cn(
                "text-xl font-semibold",
                client.noShowCount > 0 ? "text-danger" : "text-ink",
              )}
            >
              {client.noShowCount}
            </p>
            <p className="text-xs text-ink-faint mt-0.5">
              {client.noShowCount === 1 ? "Falta" : "Faltas"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3 text-center">
            <p
              className={cn(
                "text-xl font-semibold",
                client.lateCancelCount > 0 ? "text-warning" : "text-ink",
              )}
            >
              {client.lateCancelCount}
            </p>
            <p className="text-xs text-ink-faint mt-0.5">
              {client.lateCancelCount === 1
                ? "Cancelamento tardio"
                : "Cancelamentos tardios"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Cadastro */}
      <Card>
        <CardBody>
          <h2 className="font-display text-base font-bold tracking-[-0.03em] text-ink mb-2">Cadastro</h2>
          <dl className="space-y-2">
            <InfoRow label="WhatsApp" value={formatPhone(client.phone)} />
            <InfoRow label="Instagram" value={client.instagram} />
            <InfoRow
              label="Nascimento"
              value={client.birthDate ? formatDate(client.birthDate, tz) : null}
            />
            <InfoRow
              label="Como conheceu"
              value={
                client.source
                  ? ((CLIENT_SOURCES as Record<string, string>)[client.source] ??
                    client.source)
                  : null
              }
            />
            <InfoRow label="Cliente desde" value={formatDate(client.createdAt, tz)} />
          </dl>
          {client.notes ? (
            <div className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-2.5">
              <p className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">
                Observações
              </p>
              <p className="text-sm text-ink-soft mt-1 whitespace-pre-line">{client.notes}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Linha do tempo */}
      <section>
        <h2 className="font-display text-base font-bold tracking-[-0.03em] text-ink mb-2">Histórico</h2>
        <Card>
          {events.length === 0 ? (
            <EmptyState
              icon={<IconClock />}
              title="Sem histórico ainda"
              description="Atendimentos, fotos e mensagens da cliente aparecem aqui."
            />
          ) : (
            <ul className="p-4">
              {events.map((event, index) => (
                <li key={event.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-surface-sunken text-ink-soft flex items-center justify-center shrink-0">
                      {event.kind === "atendimento" ? (
                        <IconCalendar width={15} height={15} />
                      ) : event.kind === "fotos" ? (
                        <IconCamera width={15} height={15} />
                      ) : (
                        <IconChat width={15} height={15} />
                      )}
                    </span>
                    {index < events.length - 1 ? (
                      <span className="w-px grow bg-line my-1" />
                    ) : null}
                  </div>
                  <div
                    className={cn("min-w-0 grow", index < events.length - 1 && "pb-5")}
                  >
                    {event.kind === "atendimento" ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink truncate">
                            {event.serviceName}
                          </p>
                          <AppointmentStatusBadge status={event.status} />
                        </div>
                        <HistoryDate label={formatDateTime(event.date, tz)} pro={event.pro} />
                        {event.status === "CONCLUIDO" ? (
                          event.canOpen ? (
                            <Link
                              href={`/atendimentos/${event.appointmentId}`}
                              className="inline-flex items-center gap-0.5 text-xs font-medium text-accent-strong mt-1"
                            >
                              Ver ficha técnica
                              <IconChevronRight width={13} height={13} />
                            </Link>
                          ) : event.ficha ? (
                            <FichaResumo ficha={event.ficha} />
                          ) : null
                        ) : null}
                      </>
                    ) : event.kind === "fotos" ? (
                      <>
                        <p className="text-sm font-medium text-ink">
                          {event.photos.length === 1 ? "Foto" : "Fotos"} do atendimento
                        </p>
                        <HistoryDate label={formatDate(event.date, tz)} pro={event.pro} />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.photos.map((photo) => (
                            <a
                              key={photo.id}
                              href={`/api/uploads/${photo.storageKey}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/uploads/${photo.storageKey}`}
                                alt={PHOTO_KIND_LABELS[photo.photoKind] ?? "Foto"}
                                loading="lazy"
                                className="w-16 h-16 rounded-xl object-cover border border-line"
                              />
                            </a>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-ink truncate">{event.label}</p>
                        <p className="text-xs text-ink-faint mt-0.5">
                          {formatDateTime(event.date, tz)}
                        </p>
                        <ExpandableText text={event.body} className="mt-1" />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Privacidade (LGPD): exportar e excluir são da dona */}
      {viewer.isOwner ? (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2">
              <IconShield width={18} height={18} className="text-ink-soft" />
              <h2 className="font-display text-base font-bold tracking-[-0.03em] text-ink">
                Privacidade (LGPD)
              </h2>
            </div>
            <p className="text-sm text-ink-soft mt-1">
              A cliente pode pedir uma cópia dos dados dela ou a exclusão definitiva a
              qualquer momento.
            </p>
            <div className="mt-3 space-y-2">
              <a
                href={`/clientes/${client.id}/exportar`}
                download
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium text-ink active:bg-background transition-colors"
              >
                <IconDownload width={18} height={18} /> Exportar dados (JSON)
              </a>
              <DeleteClientData clientId={client.id} clientName={client.name} />
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

/** Data do item do histórico; com equipe, seguida de com quem foi. */
function HistoryDate({ label, pro }: { label: string; pro: ProView | null }) {
  if (!pro) return <p className="text-xs text-ink-faint mt-0.5">{label}</p>;
  return (
    <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-faint">
      <span>{label}</span>
      <span aria-hidden>·</span>
      <ProTag pro={pro} size={16} className="font-medium text-ink-soft" />
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-ink-faint shrink-0">{label}</dt>
      <dd className="text-sm text-ink text-right min-w-0 break-words">{value}</dd>
    </div>
  );
}
