"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IconCamera, IconCheck } from "@/components/ui/icons";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { salvarPerfilAction } from "./actions";

/** Paleta de acentos elegantes (escuros o bastante p/ texto branco). */
const PALETTE = [
  { hex: "#BE4368", nome: "Pink" },
  { hex: "#A85566", nome: "Rosé" },
  { hex: "#C24B8B", nome: "Orquídea" },
  { hex: "#7A3B47", nome: "Framboesa" },
  { hex: "#5D4157", nome: "Ameixa" },
  { hex: "#3E5C50", nome: "Eucalipto" },
  { hex: "#2F4858", nome: "Petróleo" },
  { hex: "#8A4B32", nome: "Terracota" },
  { hex: "#44403C", nome: "Grafite" },
] as const;

export type PerfilDefaults = {
  name: string;
  studioName: string;
  logoUrl: string | null;
  accentColor: string;
  addressLine: string;
  mapsUrl: string;
  whatsapp: string;
  instagram: string;
  pixKey: string;
};

export function PerfilForm({ defaults }: { defaults: PerfilDefaults }) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    salvarPerfilAction,
    initialConfigFormState,
  );

  const [accent, setAccent] = useState(defaults.accentColor);
  const [logoPreview, setLogoPreview] = useState<string | null>(defaults.logoUrl);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function onLogoChange(file: File | undefined) {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLogoPreview(url);
  }

  const isCustom = !PALETTE.some(
    (p) => p.hex.toLowerCase() === accent.toLowerCase(),
  );

  const previewVars = {
    "--accent": accent,
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
    "--accent-strong": `color-mix(in srgb, ${accent} 85%, black)`,
  } as CSSProperties;

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {/* Identidade */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Identidade</h2>

          <div className="flex items-center gap-4">
            <span className="h-16 w-16 rounded-2xl bg-surface-sunken border border-line overflow-hidden flex items-center justify-center shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Logo do estúdio"
                  className="h-full w-full object-cover"
                />
              ) : (
                <IconCamera className="text-ink-faint" />
              )}
            </span>
            <div className="min-w-0">
              <label
                htmlFor="logo"
                className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-lg bg-surface text-ink border border-line font-medium cursor-pointer hover:bg-background transition-colors"
              >
                {logoPreview ? "Trocar logo" : "Enviar logo"}
              </label>
              <input
                id="logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onLogoChange(e.target.files?.[0])}
              />
              <p className="text-xs text-ink-faint mt-1.5">JPG, PNG ou WebP · até 5MB</p>
              <FieldError message={errors.logo} />
            </div>
          </div>

          <Field label="Seu nome" htmlFor="name">
            <Input
              id="name"
              name="name"
              defaultValue={defaults.name}
              placeholder="Ex.: Ana Souza"
              autoComplete="name"
              required
            />
            <FieldError message={errors.name} />
          </Field>

          <Field label="Nome do estúdio" htmlFor="studioName">
            <Input
              id="studioName"
              name="studioName"
              defaultValue={defaults.studioName}
              placeholder="Ex.: Ana Lash Studio"
              required
            />
            <FieldError message={errors.studioName} />
          </Field>
        </CardBody>
      </Card>

      {/* Cor do app */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Cor do app</h2>
            <p className="text-[13px] text-ink-soft mt-0.5">
              O tom principal dos botões e destaques do seu LashOS.
            </p>
          </div>

          <input type="hidden" name="accentColor" value={accent} />

          <div className="grid grid-cols-4 gap-3">
            {PALETTE.map((tone) => {
              const selected = tone.hex.toLowerCase() === accent.toLowerCase();
              return (
                <button
                  key={tone.hex}
                  type="button"
                  onClick={() => setAccent(tone.hex)}
                  aria-label={`Cor ${tone.nome}`}
                  aria-pressed={selected}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "h-11 w-11 rounded-full flex items-center justify-center text-white transition-all",
                      selected
                        ? "ring-2 ring-offset-2 ring-ink/60 ring-offset-surface"
                        : "hover:scale-105",
                    )}
                    style={{ backgroundColor: tone.hex }}
                  >
                    {selected ? <IconCheck width={16} height={16} /> : null}
                  </span>
                  <span className="text-[11px] text-ink-soft">{tone.nome}</span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <span
              className={cn(
                "relative h-11 w-11 rounded-full overflow-hidden border border-line transition-all",
                isCustom ? "ring-2 ring-offset-2 ring-ink/60 ring-offset-surface" : "",
              )}
              style={{
                background: isCustom
                  ? accent
                  : "conic-gradient(#be4368, #c24b8b, #7a3b47, #5d4157, #2f4858, #3e5c50, #be4368)",
              }}
            >
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="Cor personalizada"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {isCustom ? (
                <span className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                  <IconCheck width={16} height={16} />
                </span>
              ) : null}
            </span>
            <span className="text-sm text-ink-soft">
              Cor personalizada
              <span className="block text-xs text-ink-faint uppercase">{accent}</span>
            </span>
          </label>
          <FieldError message={errors.accentColor} />

          <div
            style={previewVars}
            className="rounded-xl border border-line bg-background p-3.5 space-y-2.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Pré-visualização
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex h-9 items-center px-4 rounded-lg bg-accent text-accent-ink text-sm font-medium shadow-sm">
                Agendar
              </span>
              <span className="inline-flex h-9 items-center px-3 rounded-lg bg-accent-soft text-accent-strong text-sm font-medium">
                Destaque
              </span>
              <span className="text-accent-strong text-sm font-semibold">Link</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Contato e localização */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Contato e localização
          </h2>

          <Field
            label="WhatsApp"
            htmlFor="whatsapp"
            hint="Com DDD — usado nos links e mensagens para clientes."
          >
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={defaults.whatsapp}
              placeholder="(48) 99999-8888"
            />
            <FieldError message={errors.whatsapp} />
          </Field>

          <Field label="Instagram" htmlFor="instagram">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
                @
              </span>
              <Input
                id="instagram"
                name="instagram"
                defaultValue={defaults.instagram}
                placeholder="seuestudio"
                autoCapitalize="none"
                className="pl-8"
              />
            </div>
            <FieldError message={errors.instagram} />
          </Field>

          <Field label="Endereço" htmlFor="addressLine">
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={defaults.addressLine}
              placeholder="Rua, número, bairro — cidade/UF"
              autoComplete="street-address"
            />
            <FieldError message={errors.addressLine} />
          </Field>

          <Field
            label="Link do Google Maps"
            htmlFor="mapsUrl"
            hint="Cole o link de compartilhamento do seu estúdio no Maps."
          >
            <Input
              id="mapsUrl"
              name="mapsUrl"
              type="url"
              inputMode="url"
              defaultValue={defaults.mapsUrl}
              placeholder="https://maps.app.goo.gl/..."
            />
            <FieldError message={errors.mapsUrl} />
          </Field>
        </CardBody>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Pagamento</h2>
          <Field
            label="Chave Pix"
            htmlFor="pixKey"
            hint="Enviada nas mensagens de cobrança de sinal."
          >
            <Input
              id="pixKey"
              name="pixKey"
              defaultValue={defaults.pixKey}
              placeholder="CPF, celular, e-mail ou chave aleatória"
            />
            <FieldError message={errors.pixKey} />
          </Field>
        </CardBody>
      </Card>

      <FormError error={state.error} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar perfil"}
      </Button>

      <SavedToast savedAt={state.savedAt} message="Perfil salvo!" />
    </form>
  );
}
