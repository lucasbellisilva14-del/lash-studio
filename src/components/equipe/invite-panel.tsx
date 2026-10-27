"use client";

/**
 * Painel do convite: o link aparece uma única vez (o banco guarda só o hash).
 * A dona copia ou manda direto no WhatsApp.
 */
import { useId, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { inputBase } from "@/components/ui/field";
import { IconCheck, IconCheckCircle, IconCopy, IconMail, IconWhatsApp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { InviteInfo } from "./types";

export function InvitePanel({ invite }: { invite: InviteInfo }) {
  const inputId = useId();
  const [copiado, setCopiado] = useState(false);

  const mensagem =
    `Oi, ${invite.firstName}! Você foi convidada para a equipe do ${invite.studioName} no LashOS. ` +
    `Crie sua senha por este link (vale por 7 dias): ${invite.url}`;
  const linkWhats = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // Sem acesso à área de transferência: deixa o link selecionado para copiar à mão.
      const campo = document.getElementById(inputId);
      if (campo instanceof HTMLInputElement) {
        campo.focus();
        campo.select();
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <IconCheckCircle width={20} height={20} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[15px] font-semibold text-ink">Convite pronto para {invite.firstName}</p>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">
            Mande o link para ela. Ela cria a senha e já entra no app.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-ink">
          Link do convite
        </label>
        <input
          id={inputId}
          readOnly
          value={invite.url}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(inputBase, "text-[13.5px] text-ink-soft")}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={linkWhats}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("primary", "md")}
        >
          <IconWhatsApp width={18} height={18} />
          Enviar no WhatsApp
        </a>
        <Button type="button" variant="secondary" onClick={copiar} aria-live="polite">
          {copiado ? (
            <>
              <IconCheck width={17} height={17} className="text-success" />
              Link copiado
            </>
          ) : (
            <>
              <IconCopy width={17} height={17} />
              Copiar link
            </>
          )}
        </Button>
      </div>

      <div className="rounded-[14px] bg-surface-sunken px-3.5 py-3 text-[13px] leading-snug text-ink-soft">
        <p>Vale por 7 dias. Por segurança, o link só aparece agora.</p>
        {invite.emailSent ? (
          <p className="mt-1.5 flex items-center gap-1.5">
            <IconMail width={15} height={15} className="shrink-0" />
            Também enviamos por e-mail.
          </p>
        ) : null}
      </div>
    </div>
  );
}
