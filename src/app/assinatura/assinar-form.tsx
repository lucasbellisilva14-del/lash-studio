"use client";

import { useState, useTransition } from "react";
import { IconCard } from "@/components/ui/icons";
import { assinarAction } from "./actions";

/** Botão de assinar (cartão recorrente no Mercado Pago), dentro do cartão escuro do plano. */
export function AssinarForm({ emTeste }: { emTeste: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function assinar() {
    setError(undefined);
    startTransition(async () => {
      const res = await assinarAction();
      if (res?.error) setError(res.error);
      // sucesso = redirect pro checkout do MP (não volta aqui)
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={assinar}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-accent transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60"
      >
        <IconCard width={18} height={18} />
        {pending ? "Abrindo o Mercado Pago…" : "Assinar com cartão de crédito"}
      </button>
      {error ? (
        <p className="rounded-[14px] bg-white/10 px-3.5 py-2.5 text-[13px] text-white">{error}</p>
      ) : null}
      <p className="text-center text-[12.5px] leading-relaxed text-white/60">
        Pagamento seguro pelo Mercado Pago.
        {emTeste ? " A primeira cobrança só acontece quando o teste terminar." : ""}
      </p>
    </div>
  );
}
