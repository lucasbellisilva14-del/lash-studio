"use client";

/**
 * Formulário do cadastro: campos controlados (erro não apaga o que ela digitou),
 * escolha do plano em dois cartões e aceite dos termos.
 */
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { IconCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/money";
import { PLANS, TRIAL_DIAS, type PlanKey } from "@/lib/domain/plans";
import { comecarAction, type ComecarState } from "./actions";

const initialState: ComecarState = {};

export function ComecarForm({ planoInicial, codigoInicial }: { planoInicial: PlanKey; codigoInicial: string }) {
  const [state, formAction, pending] = useActionState(comecarAction, initialState);
  const [plano, setPlano] = useState<PlanKey>(planoInicial);
  const [codigo, setCodigo] = useState(codigoInicial);
  // Controlados: um erro de validação não apaga o que ela digitou.
  const [nome, setNome] = useState("");
  const [estudio, setEstudio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [termos, setTermos] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="plano" value={plano} />
      {/* Só robô preenche este campo. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink">Seu plano</legend>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const p = PLANS[key];
            const ativo = plano === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setPlano(key)}
                className={cn(
                  "rounded-[18px] border px-4 py-3.5 text-left transition-colors",
                  ativo ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-ink">{p.label}</span>
                  {ativo ? <IconCheck width={16} height={16} className="text-ink" /> : null}
                </span>
                <span className="mt-1 block text-[20px] font-bold tracking-[-0.03em] text-ink tabular-nums">
                  {formatBRL(p.priceCents)}
                  <span className="text-[13px] font-medium text-ink-soft">/mês</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] text-ink-soft">{p.descricao}</span>
              </button>
            );
          })}
        </div>
        {errors.plano ? <p className="mt-1.5 text-[12.5px] font-medium text-danger">{errors.plano}</p> : null}
      </fieldset>

      <Field label="Seu nome" htmlFor="c-name" error={errors.name}>
        <Input id="c-name" name="name" autoComplete="name" placeholder="Ana Souza" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Field>
      <Field label="Nome do estúdio" htmlFor="c-studio" hint="Aparece no seu link de agendamento." error={errors.studioName}>
        <Input id="c-studio" name="studioName" autoComplete="organization" placeholder="Ana Lash" value={estudio} onChange={(e) => setEstudio(e.target.value)} required />
      </Field>
      <Field label="WhatsApp" htmlFor="c-whats" error={errors.whatsapp}>
        <Input id="c-whats" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(48) 99999-8888" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
      </Field>
      <Field label="E-mail" htmlFor="c-email" hint="É o seu login." error={errors.email}>
        <Input id="c-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Crie uma senha" htmlFor="c-senha" hint="Pelo menos 8 caracteres." error={errors.senha}>
        <PasswordInput id="c-senha" name="senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
      </Field>
      <Field label="Código de indicação" htmlFor="c-codigo" hint="Opcional. Se alguém te indicou, coloque o código dela." error={errors.codigo}>
        <Input
          id="c-codigo"
          name="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))}
          autoComplete="off"
          placeholder="ANA"
          className="w-40 uppercase"
        />
      </Field>

      <label className="flex items-start gap-3 text-[13.5px] leading-snug text-ink">
        <input type="checkbox" name="termos" value="1" checked={termos} onChange={(e) => setTermos(e.target.checked)} className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--accent)]" />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="font-semibold underline underline-offset-4">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold underline underline-offset-4">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {errors.termos ? <p className="-mt-3 text-[12.5px] font-medium text-danger">{errors.termos}</p> : null}

      {state.error ? (
        <p role="alert" className="rounded-[14px] bg-danger-soft px-4 py-2.5 text-[13.5px] text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Criando sua conta..." : `Começar ${TRIAL_DIAS} dias grátis`}
      </Button>
      <p className="text-center text-[12.5px] leading-relaxed text-ink-soft">
        Na próxima tela você salva o cartão no Mercado Pago. Nenhuma cobrança até o fim do teste; cancele quando quiser.
      </p>
    </form>
  );
}
