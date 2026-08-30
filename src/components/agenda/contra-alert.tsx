"use client";

/** Alerta vermelho de contraindicação da cliente (anamnese). */
import { IconAlert } from "@/components/ui/icons";

export function ContraindicacaoAlert({ flags }: { flags: string[] }) {
  return (
    <div className="flex items-start gap-2.5 bg-danger-soft text-danger rounded-xl px-3.5 py-3">
      <IconAlert width={18} height={18} className="shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">Cliente com contraindicação</p>
        {flags.length > 0 ? (
          <p className="mt-0.5">{flags.join(" · ")}</p>
        ) : (
          <p className="mt-0.5">Confira a ficha de anamnese antes de atender.</p>
        )}
      </div>
    </div>
  );
}
