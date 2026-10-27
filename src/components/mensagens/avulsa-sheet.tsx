"use client";

/**
 * Mensagem avulsa (/mensagens?cliente=<id>): Sheet com texto livre.
 * Enviar abre o wa.me e registra MessageLog kind LIVRE.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { buttonClasses } from "@/components/ui/button";
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
  const disabled = !trimmed || isPending;

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
    <Sheet
      open={open}
      onClose={close}
      title="Mensagem avulsa"
      description={`Para ${client.name} · ${formatPhone(client.phone)}`}
      footer={
        <div className="space-y-2">
          <a
            href={trimmed ? waLink(client.phone, trimmed) : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              handleSend();
            }}
            aria-disabled={disabled}
            className={cn(
              buttonClasses("primary", "lg"),
              disabled && "pointer-events-none opacity-45",
            )}
          >
            <IconWhatsApp width={18} height={18} />
            {isPending ? "Registrando..." : "Enviar no WhatsApp"}
          </a>
          <p className="text-center text-[12.5px] leading-snug text-ink-soft">
            O WhatsApp abre com a mensagem pronta. É só tocar em enviar lá.
          </p>
        </div>
      }
    >
      <Field label="Mensagem" htmlFor="mensagem-livre" error={error ?? undefined}>
        <Textarea
          id="mensagem-livre"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva sua mensagem para a cliente..."
          className="min-h-40"
          autoFocus
        />
      </Field>
    </Sheet>
  );
}
