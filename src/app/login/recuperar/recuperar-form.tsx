"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { solicitarRecuperacao, type RecuperarState } from "./actions";

const initialState: RecuperarState = {};

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState(solicitarRecuperacao, initialState);

  if (state.ok) {
    return (
      <div className="text-center space-y-4">
        <p className="text-4xl" aria-hidden>💌</p>
        <p className="text-[15px] text-ink leading-relaxed">
          Se esse e-mail tiver uma conta no LashOS, as instruções para criar uma
          nova senha já estão a caminho. Dá uma olhada na caixa de entrada (e no
          spam, vai que).
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-accent-strong hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="E-mail da sua conta" htmlFor="email">
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
      {state.error ? (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando..." : "Enviar instruções"}
      </Button>
      <p className="text-center">
        <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-accent-strong">
          Lembrei a senha — voltar
        </Link>
      </p>
    </form>
  );
}
