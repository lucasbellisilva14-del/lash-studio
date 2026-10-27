import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";
import { formatTime } from "@/lib/dates";
import type { AppointmentStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

export type TodayAgendaItem = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  clientName: string;
  serviceName: string;
  hasContraindication: boolean;
};

/** Agenda de hoje: uma lista limpa em ordem de horário; o próximo ganha um ponto. */
export function TodayAgenda({
  items,
  nextId,
  tz,
  agendaHref,
}: {
  items: TodayAgendaItem[];
  nextId: string | null;
  nextLabel?: string | null;
  tz: string;
  agendaHref: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="px-6 py-8">
        <p className="text-[20px] font-bold tracking-[-0.03em] text-ink">Sua agenda está livre hoje.</p>
        <p className="mt-1.5 max-w-sm text-[14px] text-ink-soft">
          Veja os próximos dias na agenda ou encaixe alguém da lista de espera.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={agendaHref} className={buttonClasses("primary", "sm")}>
            Abrir agenda
          </Link>
          <Link href="/agenda/espera" className={buttonClasses("secondary", "sm")}>
            Lista de espera
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((item) => {
        const isNext = item.id === nextId;
        const encerrado = item.status === "CONCLUIDO" || item.status === "FALTOU";
        return (
          <Link
            key={item.id}
            href={agendaHref}
            className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-muted transition-colors sm:px-5"
          >
            <div className="w-12 shrink-0">
              <p
                className={cn(
                  "text-[15px] font-bold leading-5 tabular-nums tracking-[-0.02em]",
                  encerrado ? "text-ink-faint" : "text-ink",
                )}
              >
                {formatTime(item.startAt, tz)}
              </p>
              <p className="text-[11.5px] leading-4 tabular-nums text-ink-faint">
                {formatTime(item.endAt, tz)}
              </p>
            </div>
            <div className="min-w-0 grow">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                {isNext ? <span aria-label="Próxima" className="h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
                <span className="truncate">{item.clientName}</span>
                {item.hasContraindication ? (
                  <span
                    className="shrink-0 text-danger"
                    title="Contraindicação na anamnese"
                    aria-label="Contraindicação na anamnese"
                  >
                    <IconAlert width={15} height={15} />
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-ink-soft">{item.serviceName}</p>
            </div>
            <AppointmentStatusBadge status={item.status} />
          </Link>
        );
      })}
    </Card>
  );
}
