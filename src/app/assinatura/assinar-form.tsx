"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { assinarAction } from "./actions";

export function AssinarForm() {
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
      <Button size="lg" onClick={assinar} disabled={pending}>
        {pending ? "Preparando checkout..." : "💳 Assinar com cartão de crédito"}
      </Button>
      {error ? (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>
      ) : null}
      <p className="text-center text-xs text-ink-faint leading-relaxed">
        Pagamento seguro pelo Mercado Pago. Renova todo mês automaticamente —
        cancele quando quiser.
      </p>
    </div>
  );
}
