import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PeriodoRelatorio } from "@/app/(app)/relatorios/data";

const OPCOES: { valor: PeriodoRelatorio; rotulo: string }[] = [
  { valor: 30, rotulo: "30 dias" },
  { valor: 90, rotulo: "90 dias" },
  { valor: 365, rotulo: "1 ano" },
];

/** Segmented control por querystring (?periodo=30|90|365) — sem JS. */
export function PeriodoSwitch({ periodo }: { periodo: PeriodoRelatorio }) {
  return (
    <div
      role="group"
      aria-label="Período do relatório"
      className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-sunken p-1"
    >
      {OPCOES.map((o) => {
        const ativo = o.valor === periodo;
        return (
          <Link
            key={o.valor}
            href={`/relatorios?periodo=${o.valor}`}
            replace
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex h-9 select-none items-center justify-center rounded-xl text-sm font-medium transition-colors",
              ativo
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(28,25,23,0.08)]"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {o.rotulo}
          </Link>
        );
      })}
    </div>
  );
}
