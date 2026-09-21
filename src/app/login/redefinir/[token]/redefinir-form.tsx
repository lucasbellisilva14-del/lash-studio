"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { redefinirSenha, type RedefinirState } from "./actions";

const initialState: RedefinirState = {};

export function RedefinirForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(redefinirSenha, initialState);

  if (state.ok) {
    return (
      <div className="text-center space-y-4">
        <p className="text-4xl" aria-hidden>🎉</p>
        <p className="text-[15px] text-ink leading-relaxed">
          Senha nova criada! Agora é só entrar com ela.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-accent text-accent-ink text-[15px] font-medium shadow-sm hover:bg-accent-strong transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" htmlFor="senha" hint="Pelo menos 8 caracteres">
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="confirmar">
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {state.error ? (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
