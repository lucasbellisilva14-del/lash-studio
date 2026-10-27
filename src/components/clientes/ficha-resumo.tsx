/**
 * Ficha técnica em leitura, dentro do histórico da cliente. Serve à
 * funcionária nos atendimentos feitos por outra profissional: ela não abre a
 * ficha (só as dos horários dela), mas precisa da técnica, dos fios e do
 * mapping anteriores para fazer a manutenção. Abre e fecha sem JavaScript.
 */
import { cn } from "@/lib/cn";
import { parseMapping, TECHNIQUES } from "@/lib/constants";
import { IconChevronDown } from "@/components/ui/icons";

export type FichaResumoData = {
  technique: string | null;
  volumeFactor: string | null;
  /** CSV: "C,D" */
  curvatures: string | null;
  thickness: string | null;
  mappingJson: string | null;
  glueBrand: string | null;
  glueBatch: string | null;
  retentionPct: number | null;
  durationMin: number | null;
  notes: string | null;
};

function linhas(ficha: FichaResumoData): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (ficha.technique) {
    const nome = (TECHNIQUES as Record<string, string>)[ficha.technique] ?? ficha.technique;
    out.push(["Técnica", ficha.volumeFactor ? `${nome} ${ficha.volumeFactor}` : nome]);
  }
  const curvaturas = (ficha.curvatures ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (curvaturas.length > 0) out.push(["Curvatura", curvaturas.join(", ")]);
  if (ficha.thickness) out.push(["Espessura", `${ficha.thickness} mm`]);
  const mapping = parseMapping(ficha.mappingJson);
  if (mapping) out.push(["Mapping", `${mapping.zones.join(" · ")} mm`]);
  if (ficha.glueBrand || ficha.glueBatch) {
    out.push([
      "Cola",
      [ficha.glueBrand, ficha.glueBatch ? `lote ${ficha.glueBatch}` : null].filter(Boolean).join(" · "),
    ]);
  }
  if (ficha.retentionPct != null) out.push(["Retenção", `${ficha.retentionPct}%`]);
  if (ficha.durationMin != null) out.push(["Duração", `${ficha.durationMin} min`]);
  return out;
}

/** A ficha tem algo para mostrar? (ficha criada só por causa de foto fica vazia) */
export function fichaTemConteudo(ficha: FichaResumoData): boolean {
  return linhas(ficha).length > 0 || Boolean(ficha.notes?.trim());
}

export function FichaResumo({ ficha }: { ficha: FichaResumoData }) {
  const rows = linhas(ficha);
  const notes = ficha.notes?.trim();

  return (
    <details className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-0.5 text-xs font-medium text-accent-strong [&::-webkit-details-marker]:hidden">
        Ver ficha técnica
        <IconChevronDown
          width={13}
          height={13}
          className="transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="mt-2 rounded-[14px] bg-surface-sunken px-3.5 py-3">
        {rows.length > 0 ? (
          <dl className="space-y-1.5 text-[13px]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{label}</dt>
                <dd className="min-w-0 break-words text-right font-medium tabular-nums text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {notes ? (
          <p
            className={cn(
              "text-[13px] text-ink-soft whitespace-pre-line break-words",
              rows.length > 0 && "mt-2.5 border-t border-line pt-2.5",
            )}
          >
            {notes}
          </p>
        ) : null}
      </div>
    </details>
  );
}
