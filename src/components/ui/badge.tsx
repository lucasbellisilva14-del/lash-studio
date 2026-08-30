import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { AppointmentStatus, ClientStatus } from "@/lib/constants";
import { APPOINTMENT_STATUSES, CLIENT_STATUSES } from "@/lib/constants";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-soft",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const clientStatusTone: Record<ClientStatus, Tone> = {
  ATIVA: "success",
  EM_RISCO: "warning",
  INATIVA: "danger",
  SEM_HISTORICO: "neutral",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge tone={clientStatusTone[status]}>{CLIENT_STATUSES[status]}</Badge>;
}

const appointmentStatusTone: Record<AppointmentStatus, Tone> = {
  PRE_AGENDADO: "warning",
  CONFIRMADO: "accent",
  CONCLUIDO: "success",
  FALTOU: "danger",
  CANCELADO: "neutral",
  CANCELADO_TARDE: "danger",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={appointmentStatusTone[status]}>{APPOINTMENT_STATUSES[status]}</Badge>;
}
