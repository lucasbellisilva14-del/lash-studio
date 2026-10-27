import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const inputBase =
  "w-full h-11 px-3.5 rounded-[14px] border border-line bg-surface text-[15px] text-ink " +
  "placeholder:text-ink-faint outline-none transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong focus:border-accent focus:ring-[3px] focus:ring-accent/10 " +
  "disabled:opacity-50 aria-[invalid=true]:border-danger";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[13px] font-semibold text-ink mb-1.5", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "appearance-none pr-9 bg-no-repeat bg-[right_0.85rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235e5b68%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBase, "h-auto min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  /** Explica o efeito do campo ("Aparece no link que a cliente abre"). */
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

/** Bloco de campos com rótulo de grupo (Identificação, Valor e pagamento...). */
export function FieldGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("rounded-[18px] border border-line p-4 space-y-4", className)}>
      <legend className="sr-only">{label}</legend>
      <p aria-hidden className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </p>
      {children}
    </fieldset>
  );
}
