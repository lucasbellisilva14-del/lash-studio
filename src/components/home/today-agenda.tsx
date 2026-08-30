import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AppointmentStatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAlert, IconCalendar } from "@/components/ui/icons";
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

/** Agenda de hoje: cards em ordem de horário, com o próximo compromisso destacado. */
export function TodayAgenda({
  items,
  nextId,
  nextLabel,
  tz,
  agendaHref,
}: {
  items: TodayAgendaItem[];
  nextId: string | null;
  nextLabel: string | null;
  tz: string;
  agendaHref: string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconCalendar />}
          title="Dia livre"
          description="Nenhum atendimento agendado para hoje. Bom para descansar — ou encaixar alguém da fila."
          action={
            <Link
              href={agendaHref}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-background transition-colors"
            >
              Abrir agenda
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const isNext = item.id === nextId;
        return (
          <li key={item.id}>
            <Link href={agendaHref} className="block">
              <Card
                className={cn(
                  "px-3.5 py-3 transition-colors hover:bg-background",
                  isNext && "border-accent ring-1 ring-accent bg-accent-soft hover:bg-accent-soft",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-display text-[15px] font-semibold text-ink leading-5">
                      {formatTime(item.startAt, tz)}
                    </p>
                    <p className="text-[11px] text-ink-faint leading-4">
                      {formatTime(item.endAt, tz)}
                    </p>
                  </div>
                  <div className="w-px self-stretch bg-line shrink-0" aria-hidden />
                  <div className="grow min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-[15px] text-ink truncate">
                      <span className="truncate">{item.clientName}</span>
                      {item.hasContraindication ? (
                        <span
                          className="text-danger shrink-0"
                          title="Contraindicação na anamnese"
                          aria-label="Contraindicação na anamnese"
                        >
                          <IconAlert width={15} height={15} />
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-ink-soft truncate mt-0.5">{item.serviceName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isNext && nextLabel ? (
                      <Badge className="bg-accent text-accent-ink">{nextLabel}</Badge>
                    ) : null}
                    <AppointmentStatusBadge status={item.status} />
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
