"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { trocarSenhaAction } from "./actions";

export function SenhaForm() {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    trocarSenhaAction,
    initialConfigFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Sucesso: limpa os campos (a senha nova já vale no próximo login)
  useEffect(() => {
    if (state.ok && state.savedAt) formRef.current?.reset();
  }, [state.ok, state.savedAt]);

  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <Field label="Senha atual" htmlFor="senha-atual">
            <PasswordInput
              id="senha-atual"
              name="senhaAtual"
              autoComplete="current-password"
              required
            />
            <FieldError message={errors.senhaAtual} />
          </Field>
          <Field
            label="Nova senha"
            htmlFor="nova-senha"
            hint="Pelo menos 8 caracteres — misture letras e números."
          >
            <PasswordInput
              id="nova-senha"
              name="novaSenha"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <FieldError message={errors.novaSenha} />
          </Field>
          <Field label="Confirmar a nova senha" htmlFor="confirmar-senha">
            <PasswordInput
              id="confirmar-senha"
              name="confirmarSenha"
              autoComplete="new-password"
              required
            />
            <FieldError message={errors.confirmarSenha} />
          </Field>
        </CardBody>
      </Card>

      <FormError error={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Trocar senha"}
      </Button>
      <SavedToast savedAt={state.ok ? state.savedAt : undefined} message="Senha trocada!" />
    </form>
  );
}
