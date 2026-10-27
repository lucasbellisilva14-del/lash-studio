"use client";

/** Alerta vermelho de contraindicação da cliente (anamnese). */
import { IconAlert } from "@/components/ui/icons";
import { contraindicationLabel } from "@/components/clientes/contraindications";

export function ContraindicacaoAlert({ flags }: { flags: string[] }) {
  return (
    <div className="flex items-start gap-2.5 bg-danger-soft text-danger rounded-[16px] px-4 py-3">
      <IconAlert width={18} height={18} className="shrink-0 mt-0.5" />
      <div className="text-[13.5px]">
        <p className="font-semibold">Cliente com contraindicação</p>
        {flags.length > 0 ? (
          <p className="mt-0.5">{flags.map(contraindicationLabel).join(" · ")}</p>
        ) : (
          <p className="mt-0.5">Confira a ficha de anamnese antes de atender.</p>
        )}
      </div>
    </div>
  );
}
