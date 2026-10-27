"use client";

/**
 * Sheet do termo de consentimento: o texto em vigor num campo grande.
 * Vazio = volta ao termo padrão do LashOS. Vale para todas as clientes.
 *
 * O Sheet não usa portal: renderize este componente FORA de outro <form>
 * (o formulário da anamnese o coloca depois do próprio </form>).
 */
import { useActionState, useEffect, useId } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { IconAlert } from "@/components/ui/icons";
import {
  saveConsentTextAction,
  type ConsentTextState,
} from "@/app/(app)/clientes/[id]/anamnese/actions";

const initialState: ConsentTextState = {};

export function ConsentEditorSheet({
  clientId,
  currentText,
  onClose,
}: {
  clientId: string;
  /** Termo em vigor (personalizado ou padrão): valor inicial do campo. */
  currentText: string;
  /** Precisa ser estável (useCallback): fecha depois de salvar. */
  onClose: () => void;
}) {
  const formId = useId();
  const [state, formAction, pending] = useActionState(saveConsentTextAction, initialState);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  return (
    <Sheet
      open
      onClose={onClose}
      tall
      title="Termo de consentimento"
      description="Vale para todas as clientes. Apague tudo para voltar ao termo padrão do LashOS."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? "Salvando…" : "Salvar termo"}
          </Button>
        </div>
      }
    >
      <form id={formId} action={formAction} className="space-y-4">
        <input type="hidden" name="clientId" value={clientId} />
        <Field
          label="Texto do termo"
          htmlFor={`${formId}-texto`}
          hint="A cliente lê este texto antes de assinar. Cada assinatura guarda o termo como estava no dia."
        >
          <Textarea
            id={`${formId}-texto`}
            name="texto"
            defaultValue={currentText}
            rows={14}
            maxLength={4000}
          />
        </Field>

        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13.5px] font-medium text-danger"
          >
            <IconAlert width={16} height={16} className="mt-px shrink-0" />
            {state.error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
