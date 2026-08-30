"use client";

/**
 * LGPD — exclusão definitiva com confirmação dupla:
 * 1) abrir o sheet; 2) digitar EXCLUIR pra liberar o botão.
 */
import { useActionState, useState } from "react";
import {
  deleteClientDataAction,
  type DeleteClientState,
} from "@/app/(app)/clientes/actions";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconAlert, IconTrash } from "@/components/ui/icons";

export function DeleteClientData({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger-soft" size="lg" onClick={() => setOpen(true)}>
        <IconTrash width={18} height={18} /> Excluir todos os dados
      </Button>
      {open ? (
        <DeleteSheet
          clientId={clientId}
          clientName={clientName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const initialState: DeleteClientState = {};

function DeleteSheet({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState(deleteClientDataAction, initialState);
  const confirmed = confirmText.trim().toUpperCase() === "EXCLUIR";

  return (
    <Sheet open onClose={onClose} title="Excluir todos os dados">
      <div className="space-y-4 pt-1">
        <div className="flex gap-3 rounded-xl bg-danger-soft p-3.5">
          <IconAlert width={18} height={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">
            Isso apaga <strong>definitivamente</strong> os dados de {clientName}: cadastro,
            anamnese, atendimentos, fotos e mensagens. Não dá para desfazer.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="Para confirmar, digite EXCLUIR" htmlFor="delete-confirm">
            <Input
              id="delete-confirm"
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              autoCapitalize="characters"
            />
          </Field>

          {state.error ? (
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" variant="danger" size="lg" disabled={!confirmed || pending}>
            {pending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
