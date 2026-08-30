"use client";

/**
 * Mensagem avulsa (/mensagens?cliente=<id>): Sheet com texto livre.
 * Enviar abre o wa.me e registra MessageLog kind LIVRE.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Field, Textarea } from "@/components/ui/field";
import { IconWhatsApp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatPhone, waLink } from "@/lib/phone";
import { enviarMensagemLivre } from "@/app/(app)/mensagens/actions";

export function AvulsaSheet({
  client,
}: {
  client: { id: string; name: string; phone: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = body.trim();

  const close = () => {
    setOpen(false);
    router.replace("/mensagens");
  };

  const handleSend = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await enviarMensagemLivre({ clientId: client.id, body: trimmed });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        close();
      } catch {
        setError("Não foi possível registrar a mensagem. Tente de novo.");
      }
    });
  };

  return (
    <Sheet open={open} onClose={close} title="Mensagem avulsa">
      <div className="space-y-4 pt-1">
        <div className="rounded-xl bg-surface-sunken px-3.5 py-2.5">
          <p className="font-medium text-ink">{client.name}</p>
          <p className="text-xs text-ink-faint mt-0.5">{formatPhone(client.phone)}</p>
        </div>

        <Field label="Mensagem" htmlFor="mensagem-livre">
          <Textarea
            id="mensagem-livre"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva sua mensagem para a cliente..."
            className="min-h-36"
            autoFocus
          />
        </Field>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <a
          href={trimmed ? waLink(client.phone, trimmed) : undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (!trimmed || isPending) {
              e.preventDefault();
              return;
            }
            handleSend();
          }}
          aria-disabled={!trimmed || isPending}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent",
            "text-base font-medium text-accent-ink shadow-sm transition-colors select-none",
            "hover:bg-accent-strong active:bg-accent-strong",
            (!trimmed || isPending) && "pointer-events-none opacity-45",
          )}
        >
          <IconWhatsApp width={18} height={18} />
          {isPending ? "Registrando..." : "Enviar no WhatsApp"}
        </a>
        <p className="text-xs text-ink-faint text-center -mt-1">
          O WhatsApp abre com a mensagem pronta — é só tocar em enviar lá.
        </p>
      </div>
    </Sheet>
  );
}
