"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconEdit } from "@/components/ui/icons";
import {
  ClientFormSheet,
  type ClientFormInitial,
} from "@/components/clientes/client-form-sheet";

/** Botão "Editar" do perfil — abre o mesmo Sheet do cadastro. */
export function EditClientButton({ client }: { client: ClientFormInitial }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <IconEdit width={15} height={15} /> Editar
      </Button>
      {open ? (
        <ClientFormSheet open={open} onClose={() => setOpen(false)} initial={client} />
      ) : null}
    </>
  );
}
