import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientStatusBadge } from "@/components/ui/badge";
import {
  IconChat,
  IconChevronDown,
  IconChevronRight,
  IconUsers,
  IconWhatsApp,
} from "@/components/ui/icons";
import { CLIENT_STATUSES, type ClientStatus } from "@/lib/constants";
import { waLink } from "@/lib/phone";
import { cn } from "@/lib/cn";
import type { StatusGroupData } from "@/app/(app)/relatorios/data";

const DESCRICOES: Record<ClientStatus, string> = {
  ATIVA: "Dentro do prazo de manutenção",
  EM_RISCO: "Passaram do prazo de manutenção",
  INATIVA: "Muito tempo sem atendimento",
  SEM_HISTORICO: "Nunca concluíram um atendimento",
};

const NUM_TONES: Record<ClientStatus, string> = {
  ATIVA: "text-success",
  EM_RISCO: "text-warning",
  INATIVA: "text-danger",
  SEM_HISTORICO: "text-ink-faint",
};

/** Grupos com CTA de resgate + botão de WhatsApp por cliente. */
const GRUPOS_RESGATE: ClientStatus[] = ["EM_RISCO", "INATIVA"];

function diasLabel(days: number | null): string {
  if (days == null) return "Sem atendimento concluído";
  if (days === 0) return "Atendida hoje";
  if (days === 1) return "Último atendimento ontem";
  return `Último atendimento há ${days} dias`;
}

/** Clientes por status do ciclo: resumo + grupos expansíveis (details/summary, sem JS). */
export function StatusGroups({ groups }: { groups: StatusGroupData[] }) {
  const total = groups.reduce((sum, g) => sum + g.clientes.length, 0);

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={<IconUsers />}
          title="Nenhuma cliente cadastrada"
          description="Cadastre suas clientes para acompanhar o ciclo de cada uma por aqui."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumo em números */}
      <div className="grid grid-cols-4 gap-2">
        {groups.map((g) => (
          <Card key={g.status} className="px-1 py-2.5 text-center">
            <p className={cn("font-display text-xl font-semibold leading-6", NUM_TONES[g.status])}>
              {g.clientes.length}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">
              {CLIENT_STATUSES[g.status]}
            </p>
          </Card>
        ))}
      </div>

      {/* Grupos expansíveis */}
      <Card className="divide-y divide-line overflow-hidden">
        {groups.map((g) => {
          const comResgate = GRUPOS_RESGATE.includes(g.status);
          return (
            <details key={g.status} className="group">
              <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ClientStatusBadge status={g.status} />
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {g.clientes.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{DESCRICOES[g.status]}</p>
                </div>
                <IconChevronDown className="shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-line bg-surface-sunken/40 px-4 pb-3.5">
                {comResgate && g.clientes.length > 0 ? (
                  <div className="pt-3">
                    <Link
                      href="/mensagens"
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-sm font-medium text-accent-ink shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-strong"
                    >
                      <IconChat width={16} height={16} />
                      Abrir fila de mensagens
                    </Link>
                    <p className="mt-1.5 text-center text-[11px] text-ink-faint">
                      As mensagens de resgate entram na fila automaticamente
                    </p>
                  </div>
                ) : null}

                {g.clientes.length === 0 ? (
                  <p className="py-3.5 text-sm text-ink-faint">Nenhuma cliente neste grupo.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {g.clientes.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 py-2.5">
                        <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {diasLabel(c.daysSinceLast)}
                          </p>
                        </Link>
                        {comResgate ? (
                          <a
                            href={waLink(c.phone)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Chamar ${c.name} no WhatsApp`}
                            className="shrink-0 rounded-full bg-success-soft p-2 text-success transition-opacity hover:opacity-80"
                          >
                            <IconWhatsApp width={18} height={18} />
                          </a>
                        ) : (
                          <IconChevronRight
                            width={16}
                            height={16}
                            className="shrink-0 text-ink-faint"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </Card>
    </div>
  );
}
