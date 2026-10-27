"use client";

import { useState, type InputHTMLAttributes } from "react";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { inputBase } from "@/components/ui/field";

/** Campo de senha com o olho para mostrar/esconder o que foi digitado. */
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <input
        type={visivel ? "text" : "password"}
        className={cn(inputBase, "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visivel}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface-sunken hover:text-ink transition-colors"
      >
        {visivel ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
      </button>
    </div>
  );
}
