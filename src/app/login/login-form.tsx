"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="E-mail" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@seuestudio.com.br"
          required
        />
      </Field>
      <Field label="Senha" htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>
      {state.error ? (
        <p className="rounded-[14px] bg-danger-soft px-4 py-2.5 text-[13.5px] text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <p className="text-center">
        <Link
          href="/login/recuperar"
          className="text-[13.5px] font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
