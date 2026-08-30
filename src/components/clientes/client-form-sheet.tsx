"use client";

/**
 * Sheet de cadastro/edição de cliente. Monte-o condicionalmente
 * ({open ? <ClientFormSheet .../> : null}) p/ resetar o formulário a cada abertura.
 */
import { useActionState, useEffect } from "react";
import { saveClientAction, type ClientFormState } from "@/app/(app)/clientes/actions";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CLIENT_SOURCES } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";

export type ClientFormInitial = {
  id: string;
  name: string;
  phone: string;
  instagram: string;
  /** yyyy-MM-dd ou "" */
  birthDate: string;
  source: string;
  notes: string;
};

const initialState: ClientFormState = {};

export function ClientFormSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ClientFormInitial;
}) {
  const [state, formAction, pending] = useActionState(saveClientAction, initialState);

  // Edição concluída → fecha o sheet (criação redireciona pro perfil).
  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Editar cadastro" : "Nova cliente"} tall>
      <form action={formAction} className="space-y-4 pt-1">
        {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

        <Field label="Nome" htmlFor="client-name">
          <Input
            id="client-name"
            name="name"
            defaultValue={initial?.name}
            placeholder="Nome completo"
            autoComplete="name"
            maxLength={80}
            required
          />
        </Field>

        <Field label="WhatsApp" htmlFor="client-phone" hint="Com DDD. Ex.: (48) 99999-8888">
          <Input
            id="client-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={initial ? formatPhone(initial.phone) : undefined}
            placeholder="(48) 99999-8888"
            required
          />
        </Field>

        <Field label="Instagram" htmlFor="client-instagram">
          <Input
            id="client-instagram"
            name="instagram"
            defaultValue={initial?.instagram}
            placeholder="@usuario"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>

        <Field label="Data de nascimento" htmlFor="client-birthdate">
          <Input
            id="client-birthdate"
            name="birthDate"
            type="date"
            defaultValue={initial?.birthDate}
          />
        </Field>

        <Field label="Como conheceu o estúdio" htmlFor="client-source">
          <Select id="client-source" name="source" defaultValue={initial?.source ?? ""}>
            <option value="">Selecionar...</option>
            {Object.entries(CLIENT_SOURCES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Observações" htmlFor="client-notes">
          <Textarea
            id="client-notes"
            name="notes"
            defaultValue={initial?.notes}
            placeholder="Preferências, cuidados, lembretes..."
          />
        </Field>

        {state.error ? (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </form>
    </Sheet>
  );
}
