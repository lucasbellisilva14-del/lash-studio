import Link from "next/link";
import { formatTime } from "@/lib/dates";
import { waLink } from "@/lib/phone";
import { IconAlert, IconChevronRight, IconWhatsApp } from "@/components/ui/icons";

/**
 * O cartão escuro do próximo atendimento: hora grande, quem vem e o que
 * vai fazer, com o WhatsApp a um toque. É a primeira coisa que ela vê.
 */
export function NextAppointmentCard({
  startAt,
  endAt,
  clientName,
  clientPhone,
  serviceName,
  hasContraindication,
  label,
  tz,
  agendaHref,
  proLabel = null,
}: {
  startAt: Date;
  endAt: Date;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  hasContraindication: boolean;
  label: string | null;
  tz: string;
  agendaHref: string;
  /** Com equipe, na visão da dona: "com Ana" quando o horário é de outra profissional. */
  proLabel?: string | null;
}) {
  const primeiroNome = clientName.trim().split(/\s+/)[0];
  const zap = clientPhone ? waLink(clientPhone, `Oi, ${primeiroNome}! Te espero às ${formatTime(startAt, tz)}.`) : null;

  return (
    <section
      aria-label="Próximo atendimento"
      className="rounded-[24px] bg-accent p-5 text-accent-ink shadow-[var(--shadow-pop)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-white/70">Próximo atendimento</p>
        {label ? (
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white">
            {label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end gap-4">
        <p className="text-[40px] font-bold leading-none tracking-[-0.04em] tabular-nums">
          {formatTime(startAt, tz)}
        </p>
        <p className="pb-1 text-[13px] text-white/60 tabular-nums">até {formatTime(endAt, tz)}</p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[17px] font-semibold tracking-[-0.015em]">
        <span className="truncate">{clientName}</span>
        {hasContraindication ? (
          <span
            title="Contraindicação na anamnese"
            aria-label="Contraindicação na anamnese"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger text-white"
          >
            <IconAlert width={12} height={12} />
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 truncate text-[14px] text-white/70">
        {proLabel ? `${serviceName} · ${proLabel}` : serviceName}
      </p>

      <div className="mt-5 flex gap-2">
        {zap ? (
          <a
            href={zap}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-accent active:scale-[0.98] transition-transform"
          >
            <IconWhatsApp width={17} height={17} />
            WhatsApp
          </a>
        ) : null}
        <Link
          href={agendaHref}
          className="flex h-10 items-center gap-1 rounded-full bg-white/12 px-4 text-[13.5px] font-semibold text-white hover:bg-white/20 transition-colors"
        >
          Ver na agenda
          <IconChevronRight width={15} height={15} />
        </Link>
      </div>
    </section>
  );
}
