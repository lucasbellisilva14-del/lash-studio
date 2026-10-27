"use client";

/**
 * Salvamento automático dos formulários de configuração.
 * Salva quando um campo é confirmado (sair do campo, escolher uma opção,
 * marcar uma caixa) — nunca no meio da digitação. Chama a server action
 * direto (sem o reset automático de <form action>), então o que está sendo
 * digitado em outro campo não se perde quando um salvamento termina.
 */
import { useCallback, useEffect, useRef, useTransition, type RefObject } from "react";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type EstadoDoForm = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  savedAt?: number;
};

export function useAutoSave(
  formRef: RefObject<HTMLFormElement | null>,
  dispatch: (formData: FormData) => void,
  delay = 450,
) {
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salvarAgora = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const form = formRef.current;
    if (!form) return;
    const dados = new FormData(form);
    // Arquivo vai uma vez só: limpa o campo para não reenviar a cada salvamento.
    form.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((i) => {
      i.value = "";
    });
    startTransition(() => dispatch(dados));
  }, [formRef, dispatch]);

  const agendar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(salvarAgora, delay);
  }, [salvarAgora, delay]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const aoMudar = (e: Event) => {
      if ((e.target as HTMLElement).closest("[data-sem-autosave]")) return;
      agendar();
    };
    form.addEventListener("change", aoMudar);
    return () => {
      form.removeEventListener("change", aoMudar);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [formRef, agendar]);

  /** Para o onSubmit do form (Enter num campo): salva já, sem recarregar. */
  const aoEnviar = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      salvarAgora();
    },
    [salvarAgora],
  );

  return { agendar, salvarAgora, aoEnviar };
}

/** Selo do topo do formulário: salvamento automático, salvando, salvo ou erro. */
export function AutoSaveStatus({
  pending,
  state,
  className,
}: {
  pending: boolean;
  state: EstadoDoForm;
  className?: string;
}) {
  const comErro =
    !pending && (Boolean(state.error) || Object.keys(state.fieldErrors ?? {}).length > 0);

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors",
        pending
          ? "bg-surface-sunken text-ink-soft"
          : comErro
            ? "bg-danger-soft text-danger"
            : "bg-success-soft text-success",
        className,
      )}
    >
      {pending ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
      ) : comErro ? (
        <IconAlert width={13} height={13} />
      ) : (
        <IconCheck width={13} height={13} />
      )}
      {pending
        ? "Salvando…"
        : comErro
          ? "Não salvou: confira os campos"
          : state.savedAt
            ? "Tudo salvo"
            : "Salvamento automático"}
    </span>
  );
}
