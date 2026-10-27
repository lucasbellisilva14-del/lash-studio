"use client";

/**
 * "Falar com o suporte": Dúvida, Problema ou Sugestão. A mensagem chega no
 * painel admin (e por e-mail) já com o estúdio e a tela onde ela estava.
 * Com NEXT_PUBLIC_SUPPORT_WHATSAPP, também oferece seguir pelo WhatsApp.
 */
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { Button, buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Textarea } from "@/components/ui/field";
import { IconCheckCircle, IconChevronRight, IconSupport, IconWhatsApp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { enviarSuporteAction, type SupportState } from "./support-actions";

const TIPOS = [
  { value: "DUVIDA", label: "Dúvida" },
  { value: "PROBLEMA", label: "Problema" },
  { value: "SUGESTAO", label: "Sugestão" },
] as const;

const initial: SupportState = { ok: false };
const WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");

export function SupportButton({ variant = "nav" }: { variant?: "nav" | "row" | "button" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "nav" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-left text-[14px] font-semibold text-ink-soft hover:bg-surface-sunken hover:text-ink transition-colors"
        >
          <IconSupport width={19} height={19} />
          Falar com o suporte
        </button>
      ) : variant === "row" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-surface-muted transition-colors"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft">
            <IconSupport width={18} height={18} />
          </span>
          <span className="min-w-0 grow">
            <span className="block text-[15px] font-semibold text-ink">Falar com o suporte</span>
            <span className="block truncate text-[13px] text-ink-soft">Dúvida, problema ou sugestão</span>
          </span>
          <IconChevronRight width={18} height={18} className="shrink-0 text-ink-faint" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses("secondary", "sm")}>
          <IconSupport width={16} height={16} />
          Suporte
        </button>
      )}
      {open ? <SupportSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SupportSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("DUVIDA");
  const [mensagem, setMensagem] = useState("");
  const [state, formAction, pending] = useActionState(enviarSuporteAction, initial);
  const enviado = state.ok;

  const linkWhats = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        `Oi! Preciso de ajuda com o LashOS (tela ${pathname}).${mensagem ? `\n\n${mensagem}` : ""}`,
      )}`
    : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Falar com o suporte"
      description="Conte o que aconteceu. A resposta chega no seu e-mail ou WhatsApp."
      footer={
        enviado ? (
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" form="suporte-form" disabled={pending || mensagem.trim().length < 5}>
              {pending ? "Enviando…" : "Enviar mensagem"}
            </Button>
          </div>
        )
      }
    >
      {enviado ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <IconCheckCircle width={24} height={24} />
          </span>
          <p className="mt-4 text-[16px] font-bold tracking-[-0.015em] text-ink">Mensagem enviada</p>
          <p className="mt-1.5 max-w-72 text-[14px] text-ink-soft">
            Ela chegou com o nome do seu estúdio e a tela em que você estava. A resposta vai para o seu e-mail ou WhatsApp.
          </p>
        </div>
      ) : (
        <form id="suporte-form" action={formAction} className="space-y-5">
          <input type="hidden" name="tela" value={pathname} />
          <input type="hidden" name="tipo" value={tipo} />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">Sobre o quê?</p>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <Chip key={t.value} selected={tipo === t.value} onClick={() => setTipo(t.value)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <Field
            label="Mensagem"
            htmlFor="suporte-msg"
            hint={
              tipo === "PROBLEMA"
                ? "Se puder, diga o que você tentou fazer e o que apareceu na tela."
                : tipo === "SUGESTAO"
                  ? "Sua ideia ajuda a decidir o que vem a seguir no app."
                  : "Pode perguntar à vontade."
            }
            error={state.error}
          >
            <Textarea
              id="suporte-msg"
              name="mensagem"
              rows={5}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Como podemos ajudar?"
              maxLength={2000}
            />
          </Field>
          {linkWhats ? (
            <a
              href={linkWhats}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClasses("ghost", "sm"), "-ml-2")}
            >
              <IconWhatsApp width={16} height={16} />
              Prefiro chamar no WhatsApp
            </a>
          ) : null}
        </form>
      )}
    </Sheet>
  );
}
