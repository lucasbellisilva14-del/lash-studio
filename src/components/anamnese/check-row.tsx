/**
 * Caixa de marcar em linha inteira: rótulo + dica do que acontece.
 * Usa um checkbox nativo (teclado e leitor de tela) com a caixa desenhada
 * nos tokens do app. `tone="danger"` para o que vira alerta.
 */
import { cn } from "@/lib/cn";
import { IconCheck } from "@/components/ui/icons";

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
  tone = "accent",
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  tone?: "accent" | "danger";
  disabled?: boolean;
}) {
  const danger = tone === "danger";
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-start gap-3 rounded-[14px] border px-3.5 py-3 transition-colors",
        checked
          ? danger
            ? "border-danger/30 bg-danger-soft"
            : "border-accent/25 bg-accent-soft"
          : "border-line bg-surface hover:border-line-strong",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
          "peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent/20",
          checked
            ? danger
              ? "border-danger bg-danger text-white"
              : "border-accent bg-accent text-accent-ink"
            : "border-line-strong bg-surface",
        )}
      >
        {checked ? <IconCheck width={13} height={13} strokeWidth={2.2} /> : null}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[14px] font-semibold leading-snug",
            checked && danger ? "text-danger" : "text-ink",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
