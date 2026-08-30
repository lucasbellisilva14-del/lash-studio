"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { IconCheck } from "@/components/ui/icons";

/** Toast "Salvo!" — aparece quando savedAt muda e some sozinho. */
export function SavedToast({
  savedAt,
  message = "Salvo!",
}: {
  savedAt?: number;
  message?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(timer);
  }, [savedAt]);

  if (!savedAt) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        "bottom-[calc(96px+env(safe-area-inset-bottom))]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
    >
      <div className="flex items-center gap-2 bg-ink text-white text-sm font-medium pl-2.5 pr-4 py-2 rounded-full shadow-lg">
        <span className="h-6 w-6 rounded-full bg-success flex items-center justify-center shrink-0">
          <IconCheck width={13} height={13} />
        </span>
        {message}
      </div>
    </div>
  );
}

/** Erro geral do formulário. */
export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-sm text-danger bg-danger-soft rounded-xl px-3.5 py-2.5">{error}</p>
  );
}

/** Erro de um campo específico. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}
