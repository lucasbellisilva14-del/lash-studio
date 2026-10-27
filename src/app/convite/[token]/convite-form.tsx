"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { IconCheckCircle } from "@/components/ui/icons";
import { aceitarConviteAction, type ConviteState } from "./actions";
import { ConviteInvalido } from "./convite-invalido";

const initialState: ConviteState = {};

export function ConviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(aceitarConviteAction, initialState);

  if (state.expirado) return <ConviteInvalido />;

  if (state.criada) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <IconCheckCircle width={24} height={24} />
        </span>
        <p className="mt-4 text-[16px] font-bold tracking-[-0.015em] text-ink">Senha criada</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
          Agora é só entrar com o seu e-mail e a senha nova.
        </p>
        <Link href="/login" className={buttonClasses("primary", "lg", "mt-6")}>
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Seu login" htmlFor="convite-email" hint="É com este e-mail que você entra no app.">
        <Input
          id="convite-email"
          name="username"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
          className="bg-surface-sunken text-ink-soft"
        />
      </Field>
      <Field label="Crie sua senha" htmlFor="convite-senha" hint="Pelo menos 8 caracteres.">
        <PasswordInput
          id="convite-senha"
          name="senha"
          autoComplete="new-password"
          minLength={8}
          maxLength={100}
          required
        />
      </Field>
      <Field label="Confirme a senha" htmlFor="convite-confirmar">
        <PasswordInput
          id="convite-confirmar"
          name="confirmar"
          autoComplete="new-password"
          minLength={8}
          maxLength={100}
          required
        />
      </Field>
      {state.error ? (
        <p role="alert" className="rounded-[14px] bg-danger-soft px-4 py-2.5 text-[13.5px] text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Criando sua senha..." : "Criar senha e entrar"}
      </Button>
    </form>
  );
}
