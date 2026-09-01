import type { ReactNode } from "react";
import { IconSparkles } from "@/components/relatorios/icons";

/** Caixa de insight em linguagem natural (destaque suave no tom de acento). */
export function InsightBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-accent-soft px-3.5 py-3">
      <IconSparkles width={16} height={16} className="mt-0.5 shrink-0 text-accent-strong" />
      <p className="text-sm leading-snug text-accent-strong">{children}</p>
    </div>
  );
}
