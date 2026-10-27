"use client";

/** Confirmação de soft delete. Aplicação com manutenção ativa vinculada é bloqueada. */
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconAlert } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { deactivateService, type ServiceActionState } from "@/app/(app)/servicos/actions";
import type { ServiceItem } from "@/components/servicos/types";

const initialState: ServiceActionState = { ok: false, error: null };

export function DeactivateSheet({
  service,
  linkedActiveCount,
  onClose,
  onDone,
}: {
  service: ServiceItem;
  /** Manutenções ativas vinculadas a este serviço (bloqueia a desativação). */
  linkedActiveCount: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(deactivateService, initialState);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  const blocked = linkedActiveCount > 0;

  if (blocked) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Não dá para desativar ainda"
        footer={
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Entendi
          </Button>
        }
      >
        <div className="flex items-start gap-2.5 rounded-[14px] bg-warning-soft px-3.5 py-3 text-[13.5px] leading-snug text-warning">
          <IconAlert width={18} height={18} className="mt-px shrink-0" />
          <p>
            “{service.name}” tem{" "}
            {linkedActiveCount === 1
              ? "1 manutenção ativa vinculada"
              : `${linkedActiveCount} manutenções ativas vinculadas`}{" "}
            a ele. Desative ou desvincule a manutenção antes de desativar a aplicação.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Desativar serviço?"
      footer={
        <form action={formAction} className="grid gap-2">
          <input type="hidden" name="id" value={service.id} />
          <Button variant="danger" size="lg" disabled={pending}>
            {pending ? "Desativando..." : "Desativar serviço"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
        </form>
      }
    >
      <p className="text-[14px] leading-relaxed text-ink-soft">
        “{service.name}” sai da lista na hora de agendar e do seu link de agendamento,
        mas o histórico de atendimentos fica intacto. Dá para reativar quando quiser.
      </p>
      {state.error ? (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13.5px] leading-snug text-danger"
        >
          <IconAlert width={18} height={18} className="mt-px shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
    </Sheet>
  );
}
