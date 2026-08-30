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
import {
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconEye,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { reactivateService, type ServiceActionState } from "@/app/(app)/servicos/actions";
import { DeactivateSheet } from "@/components/servicos/deactivate-sheet";
import { IconLink } from "@/components/servicos/icons";
import { ServiceFormSheet } from "@/components/servicos/service-form-sheet";
import { formatDurationMin, type ServiceItem } from "@/components/servicos/types";

const initialState: ServiceActionState = { ok: false, error: null };

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
        <EmptyState
          icon={<IconEye />}
          title="Nenhum serviço cadastrado"
          description="Cadastre os serviços que você oferece para agendar em segundos."
          action={<Button onClick={openNew}>Novo serviço</Button>}
        />
      ) : (
        <>
          {(Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((key) => {
            const items = actives.filter((s) => s.category === key);
            if (items.length === 0) return null;
            return (
              <section key={key} className="mb-5">
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                  {SERVICE_CATEGORIES[key]}
                </h2>
                <Card>
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
            <EmptyState
              icon={<IconEye />}
              title="Nenhum serviço ativo"
              description="Reative um serviço desativado ou cadastre um novo."
              action={<Button onClick={openNew}>Novo serviço</Button>}
            />
          ) : null}

          {inactives.length > 0 ? (
            <section className="mb-5">
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                aria-expanded={showInactive}
                className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left"
              >
                <span className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">
                  Desativados ({inactives.length})
                </span>
                <IconChevronDown
                  width={16}
                  height={16}
                  className={cn(
                    "text-ink-faint transition-transform",
                    showInactive && "rotate-180",
                  )}
                />
              </button>
              {showInactive ? (
                <Card>
                  <ul className="divide-y divide-line">
                    {inactives.map((service) => (
                      <InactiveRow key={service.id} service={service} />
                    ))}
                  </ul>
                </Card>
              ) : null}
            </section>
          ) : null}
        </>
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
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-surface-sunken"
      >
        <div className="min-w-0 grow">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-ink">{service.name}</span>
            {service.requiresDeposit ? <Badge tone="accent">Exige sinal</Badge> : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
            <IconClock width={14} height={14} className="text-ink-faint" />
            {formatDurationMin(service.durationMin)}
          </p>
          {service.category === "MANUTENCAO" ? (
            service.maintenanceOfName ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
                <IconLink width={12} height={12} />
                Manutenção de {service.maintenanceOfName}
              </p>
            ) : (
              <p className="mt-1 text-xs text-warning">Sem aplicação vinculada</p>
            )
          ) : null}
        </div>
        <span className="shrink-0 font-medium text-ink">
          {formatBRL(service.priceCents)}
        </span>
        <IconChevronRight width={16} height={16} className="shrink-0 text-ink-faint" />
      </button>
    </li>
  );
}

function InactiveRow({ service }: { service: ServiceItem }) {
  const [state, formAction, pending] = useActionState(reactivateService, initialState);

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 grow">
        <p className="truncate font-medium text-ink-soft">{service.name}</p>
        <p className="mt-0.5 text-sm text-ink-faint">
          {SERVICE_CATEGORIES[service.category]} ·{" "}
          {formatDurationMin(service.durationMin)} · {formatBRL(service.priceCents)}
        </p>
        {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
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
