"use client";

/**
 * Lista de serviços agrupada por categoria + CRUD via Sheet.
 * Inativos ficam numa seção recolhida "Desativados" com ação de reativar.
 */
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { IconChevronDown, IconChevronRight, IconScissors } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { reactivateService, type ServiceActionState } from "@/app/(app)/servicos/actions";
import { DeactivateSheet } from "@/components/servicos/deactivate-sheet";
import { ServiceFormSheet } from "@/components/servicos/service-form-sheet";
import {
  acceptsReturnDays,
  formatDurationMin,
  formatReturnDays,
  type ServiceItem,
} from "@/components/servicos/types";

const initialState: ServiceActionState = { ok: false, error: null };

/** "2h · volta em 45 dias" · "1h30 · manutenção de Volume brasileiro" */
function serviceDetails(service: ServiceItem): string {
  const parts = [formatDurationMin(service.durationMin)];
  if (service.returnDays != null && acceptsReturnDays(service.category)) {
    parts.push(formatReturnDays(service.returnDays));
  }
  if (service.category === "MANUTENCAO" && service.maintenanceOfName) {
    parts.push(`manutenção de ${service.maintenanceOfName}`);
  }
  return parts.join(" · ");
}

export function ServicosView({ services }: { services: ServiceItem[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [deactivating, setDeactivating] = useState<ServiceItem | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const actives = services.filter((s) => s.active);
  const inactives = services.filter((s) => !s.active);

  const aplicacoes = actives
    .filter((s) => s.category === "APLICACAO")
    .map((s) => ({ id: s.id, name: s.name }));

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (service: ServiceItem) => {
    setEditing(service);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const linkedActiveCount = deactivating
    ? actives.filter((s) => s.maintenanceOfId === deactivating.id).length
    : 0;

  return (
    <>
      {services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconScissors />}
            title="Nenhum serviço cadastrado"
            description="Cadastre o que você oferece para agendar em segundos e aparecer no seu link."
            action={<Button onClick={openNew}>Novo serviço</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((key) => {
            const items = actives.filter((s) => s.category === key);
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="mb-2.5 flex items-baseline gap-2 px-1 text-[15px] font-bold tracking-[-0.015em] text-ink">
                  {SERVICE_CATEGORIES[key]}
                  <span className="text-[13px] font-semibold tabular-nums text-ink-faint">
                    {items.length}
                  </span>
                </h2>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {items.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        onClick={() => openEdit(service)}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}

          {actives.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconScissors />}
                title="Nenhum serviço ativo"
                description="Reative um serviço desativado ou cadastre um novo."
                action={<Button onClick={openNew}>Novo serviço</Button>}
              />
            </Card>
          ) : null}

          {inactives.length > 0 ? (
            <section>
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                aria-expanded={showInactive}
                className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left"
              >
                <span className="flex items-baseline gap-2 text-[15px] font-bold tracking-[-0.015em] text-ink">
                  Desativados
                  <span className="text-[13px] font-semibold tabular-nums text-ink-faint">
                    {inactives.length}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft">
                  {showInactive ? "Esconder" : "Mostrar"}
                  <IconChevronDown
                    width={16}
                    height={16}
                    className={cn("transition-transform duration-150", showInactive && "rotate-180")}
                  />
                </span>
              </button>
              {showInactive ? (
                <Card className="mt-2.5 overflow-hidden">
                  <ul className="divide-y divide-line">
                    {inactives.map((service) => (
                      <InactiveRow key={service.id} service={service} />
                    ))}
                  </ul>
                </Card>
              ) : null}
            </section>
          ) : null}
        </div>
      )}

      <Fab label="Novo serviço" onClick={openNew} />

      {formOpen ? (
        <ServiceFormSheet
          key={editing?.id ?? "novo"}
          service={editing}
          aplicacoes={aplicacoes}
          onClose={closeForm}
          onRequestDeactivate={(service) => setDeactivating(service)}
        />
      ) : null}

      {deactivating ? (
        <DeactivateSheet
          service={deactivating}
          linkedActiveCount={linkedActiveCount}
          onClose={() => setDeactivating(null)}
          onDone={() => {
            setDeactivating(null);
            closeForm();
          }}
        />
      ) : null}
    </>
  );
}

function ServiceRow({
  service,
  onClick,
}: {
  service: ServiceItem;
  onClick: () => void;
}) {
  const semVinculo = service.category === "MANUTENCAO" && !service.maintenanceOfName;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted active:bg-surface-sunken sm:px-5"
      >
        <span className="min-w-0 grow">
          <span className="block text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            {service.name}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
            {serviceDetails(service)}
          </span>
          {semVinculo ? (
            <span className="mt-1 block text-[12.5px] font-medium text-warning">
              Sem aplicação vinculada
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[15px] font-semibold tabular-nums text-ink">
            {formatBRL(service.priceCents)}
          </span>
          {service.requiresDeposit ? <Badge>Exige sinal</Badge> : null}
        </span>
        <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
      </button>
    </li>
  );
}

function InactiveRow({ service }: { service: ServiceItem }) {
  const [state, formAction, pending] = useActionState(reactivateService, initialState);

  return (
    <li className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 grow">
        <p className="truncate text-[15px] font-semibold text-ink-soft">{service.name}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-faint">
          {SERVICE_CATEGORIES[service.category]} · {formatDurationMin(service.durationMin)} ·{" "}
          {formatBRL(service.priceCents)}
        </p>
        {state.error ? (
          <p className="mt-1 text-[12.5px] font-medium text-danger">{state.error}</p>
        ) : null}
      </div>
      <form action={formAction} className="shrink-0">
        <input type="hidden" name="id" value={service.id} />
        <Button size="sm" variant="secondary" disabled={pending}>
          {pending ? "Reativando..." : "Reativar"}
        </Button>
      </form>
    </li>
  );
}
