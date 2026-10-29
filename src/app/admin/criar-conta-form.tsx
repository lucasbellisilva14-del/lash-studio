"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { criarContaAction, type AdminState } from "./actions";

const initial: AdminState = { ok: false };

export function CriarContaForm() {
  const [state, formAction, pending] = useActionState(criarContaAction, initial);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome da profissional" htmlFor="ad-nome">
        <Input id="ad-nome" name="name" placeholder="Maria Silva" required />
      </Field>
      <Field label="Nome do estúdio" htmlFor="ad-studio">
        <Input id="ad-studio" name="studioName" placeholder="Maria Lash" required />
      </Field>
      <Field label="E-mail (login)" htmlFor="ad-email">
        <Input id="ad-email" name="email" type="email" placeholder="maria@gmail.com" required />
      </Field>
      <Field label="Senha inicial" htmlFor="ad-senha" hint="Mínimo 8 caracteres — ela troca depois">
        <Input id="ad-senha" name="senha" placeholder="senha provisória" required minLength={8} />
      </Field>
      <Field label="Mensalidade (R$)" htmlFor="ad-preco" hint="Preço calibrado dessa cliente">
        <Input id="ad-preco" name="preco" placeholder="99,00" required inputMode="decimal" />
      </Field>
      <Field label="Plano" htmlFor="ad-plano" hint="Com equipe, o Lash solo sobe para Empresa sozinho">
        <Select id="ad-plano" name="plano" defaultValue="SOLO">
          <option value="SOLO">Lash solo (R$ 49,90)</option>
          <option value="EMPRESA">Empresa (R$ 120,00)</option>
        </Select>
      </Field>
      <Field label="Dias de teste grátis" htmlFor="ad-trial" hint="0 = já entra como ativa (30 dias)">
        <Input id="ad-trial" name="trialDias" type="number" defaultValue={7} min={0} max={60} />
      </Field>

      <div className="sm:col-span-2 space-y-2">
        {state.error ? (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
            Conta criada! Já veio com serviços, mensagens e horários do modelo.
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Criando..." : "Criar conta"}
        </Button>
      </div>
    </form>
  );
}
