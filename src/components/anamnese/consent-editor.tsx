"use client";

/**
 * Botão discreto "Editar termo" → Sheet com textarea.
 * Vazio = volta ao termo padrão do LashOS.
 */
import { useActionState, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { IconEdit } from "@/components/ui/icons";
import {
  saveConsentTextAction,
  type ConsentTextState,
} from "@/app/(app)/clientes/[id]/anamnese/actions";

const initialState: ConsentTextState = {};

export function ConsentEditor({
  clientId,
  currentText,
}: {
  clientId: string;
  /** Termo em vigor (personalizado ou padrão) — valor inicial do textarea. */
  currentText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-faint hover:text-ink-soft transition-colors"
      >
        <IconEdit width={14} height={14} /> Editar termo
      </button>
      {open ? (
        <ConsentEditorSheet
          clientId={clientId}
          currentText={currentText}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ConsentEditorSheet({
  clientId,
  currentText,
  onClose,
}: {
  clientId: string;
  currentText: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveConsentTextAction, initialState);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Sheet open onClose={onClose} title="Termo de consentimento" tall>
      <form action={formAction} className="space-y-4 pt-1">
        <input type="hidden" name="clientId" value={clientId} />
        <Field
          label="Texto do termo"
          htmlFor="consent-text"
          hint="Este texto vale para todas as clientes. Apague tudo para voltar ao termo padrão do LashOS."
        >
          <Textarea
            id="consent-text"
            name="texto"
            defaultValue={currentText}
            className="min-h-72 text-sm"
            maxLength={4000}
          />
        </Field>

        {state.error ? (
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando..." : "Salvar termo"}
        </Button>
      </form>
    </Sheet>
  );
}
