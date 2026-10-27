"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IconCamera, IconCheck } from "@/components/ui/icons";
import { FieldError, FormError, SavedToast } from "@/components/config/feedback";
import { AutoSaveStatus, useAutoSave } from "@/components/config/autosave";
import { type ConfigFormState, initialConfigFormState } from "../form-state";
import { salvarPerfilAction } from "./actions";

/** Acentos do link público (escuros o bastante p/ texto branco). */
const PALETTE = [
  { hex: "#D6336C", nome: "Pink" },
  { hex: "#BE4368", nome: "Rosa queimado" },
  { hex: "#C24B8B", nome: "Orquídea" },
  { hex: "#A85566", nome: "Rosé" },
  { hex: "#7A3B47", nome: "Framboesa" },
  { hex: "#5D4157", nome: "Ameixa" },
  { hex: "#3E5C50", nome: "Eucalipto" },
  { hex: "#8A4B32", nome: "Terracota" },
  { hex: "#44403C", nome: "Grafite" },
] as const;

/** Fundos claros do link público. */
const BG_PALETTE = [
  { hex: "#FFD9E9", nome: "Rosa vivo" },
  { hex: "#FFEDF4", nome: "Rosa claro" },
  { hex: "#F6EBDD", nome: "Champagne" },
  { hex: "#F3E8FA", nome: "Lavanda" },
  { hex: "#E4F0FA", nome: "Céu" },
  { hex: "#E7F4EC", nome: "Menta" },
  { hex: "#FBEFE6", nome: "Pêssego" },
  { hex: "#F7F6F3", nome: "Neutro" },
] as const;

export type PerfilDefaults = {
  name: string;
  studioName: string;
  logoUrl: string | null;
  accentColor: string;
  backgroundColor: string;
  addressLine: string;
  mapsUrl: string;
  whatsapp: string;
  instagram: string;
  pixKey: string;
};

function Amostra({
  hex,
  nome,
  selecionada,
  onClick,
  claro = false,
}: {
  hex: string;
  nome: string;
  selecionada: boolean;
  onClick: () => void;
  claro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={nome}
      aria-pressed={selecionada}
      className="flex flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-transform",
          claro ? "text-ink ring-1 ring-line" : "text-white",
          selecionada ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "hover:scale-105",
        )}
        style={{ backgroundColor: hex }}
      >
        {selecionada ? <IconCheck width={15} height={15} /> : null}
      </span>
      <span className="text-[11px] text-ink-soft">{nome}</span>
    </button>
  );
}

export function PerfilForm({ defaults }: { defaults: PerfilDefaults }) {
  const [state, formAction, pending] = useActionState<ConfigFormState, FormData>(
    salvarPerfilAction,
    initialConfigFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { agendar, aoEnviar } = useAutoSave(formRef, formAction);

  const [accent, setAccent] = useState(defaults.accentColor);
  const [bg, setBg] = useState(defaults.backgroundColor);
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

  function escolherAcento(hex: string) {
    setAccent(hex);
    agendar();
  }

  function escolherFundo(hex: string) {
    setBg(hex);
    agendar();
  }

  const isCustom = !PALETTE.some((p) => p.hex.toLowerCase() === accent.toLowerCase());
  const isCustomBg = !BG_PALETTE.some((p) => p.hex.toLowerCase() === bg.toLowerCase());

  // Prévia do link público com as cores escolhidas
  const previewVars = {
    "--accent": accent,
    "--accent-soft": `color-mix(in srgb, ${accent} 10%, white)`,
    background: bg,
  } as CSSProperties;

  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} onSubmit={aoEnviar} className="space-y-5">
      <div className="flex justify-end">
        <AutoSaveStatus pending={pending} state={state} />
      </div>

      {/* Identidade */}
      <Card>
        <CardHeader title="Identidade" description="Como o estúdio aparece para as clientes." />
        <CardBody className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-line-strong bg-surface-muted">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo do estúdio" className="h-full w-full object-cover" />
              ) : (
                <IconCamera className="text-ink-faint" />
              )}
            </span>
            <div className="min-w-0">
              <label
                htmlFor="logo"
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink hover:border-line-strong transition-colors"
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
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">
                Aparece no seu link de agendamento e no resumo da semana. Quadrada fica melhor. JPG,
                PNG ou WebP até 5 MB.
              </p>
              <FieldError message={errors.logo} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seu nome" htmlFor="name" hint="É como o app te chama." error={errors.name}>
              <Input
                id="name"
                name="name"
                defaultValue={defaults.name}
                placeholder="Ex.: Ana Souza"
                autoComplete="name"
                required
              />
            </Field>

            <Field
              label="Nome do estúdio"
              htmlFor="studioName"
              hint="Aparece no link de agendamento e nas mensagens."
              error={errors.studioName}
            >
              <Input
                id="studioName"
                name="studioName"
                defaultValue={defaults.studioName}
                placeholder="Ex.: Ana Lash Studio"
                required
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Cores do link público */}
      <Card>
        <CardHeader
          title="Cores do seu link de agendamento"
          description="Valem só na página que a cliente abre para agendar. O app continua neutro."
        />
        <CardBody className="space-y-5">
          <input type="hidden" name="accentColor" value={accent} />
          <input type="hidden" name="backgroundColor" value={bg} />

          <div>
            <p className="mb-3 text-[13px] font-semibold text-ink">Cor dos botões</p>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-9">
              {PALETTE.map((tone) => (
                <Amostra
                  key={tone.hex}
                  hex={tone.hex}
                  nome={tone.nome}
                  selecionada={tone.hex.toLowerCase() === accent.toLowerCase()}
                  onClick={() => escolherAcento(tone.hex)}
                />
              ))}
              <label className="flex cursor-pointer flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-line",
                    isCustom && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                  style={{
                    background: isCustom
                      ? accent
                      : "conic-gradient(#d6336c, #c24b8b, #7a3b47, #5d4157, #3e5c50, #be4368, #d6336c)",
                  }}
                >
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    aria-label="Cor dos botões personalizada"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </span>
                <span className="text-[11px] text-ink-soft">Outra</span>
              </label>
            </div>
            <FieldError message={errors.accentColor} />
          </div>

          <div>
            <p className="mb-3 text-[13px] font-semibold text-ink">Fundo da página</p>
            <div className="grid grid-cols-5 gap-3 sm:grid-cols-9">
              {BG_PALETTE.map((tone) => (
                <Amostra
                  key={tone.hex}
                  hex={tone.hex}
                  nome={tone.nome}
                  claro
                  selecionada={tone.hex.toLowerCase() === bg.toLowerCase()}
                  onClick={() => escolherFundo(tone.hex)}
                />
              ))}
              <label className="flex cursor-pointer flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-line",
                    isCustomBg && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                  style={{
                    background: isCustomBg
                      ? bg
                      : "conic-gradient(#ffd9e9, #f6ebdd, #f3e8fa, #e4f0fa, #e7f4ec, #ffd9e9)",
                  }}
                >
                  <input
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    aria-label="Fundo personalizado"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </span>
                <span className="text-[11px] text-ink-soft">Outro</span>
              </label>
            </div>
            <FieldError message={errors.backgroundColor} />
          </div>

          {/* Prévia */}
          <div style={previewVars} className="rounded-[18px] border border-line p-4">
            <p className="text-[12px] font-semibold text-ink-soft">Prévia do link</p>
            <div className="mt-3 rounded-[14px] bg-surface p-3.5 shadow-[var(--shadow-card)]">
              <p className="text-[14px] font-bold text-ink">{defaults.studioName || "Seu estúdio"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-[var(--accent-soft)] px-3 text-[12.5px] font-semibold text-ink">
                  14:00
                </span>
                <span className="inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-white">
                  Confirmar horário
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Contato e localização */}
      <Card>
        <CardHeader title="Contato e endereço" description="O que a cliente usa para falar com você e chegar." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="WhatsApp"
            htmlFor="whatsapp"
            hint="Com DDD. É o contato que aparece para as clientes."
            error={errors.whatsapp}
          >
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={defaults.whatsapp}
              placeholder="(48) 99999-8888"
            />
          </Field>

          <Field label="Instagram" htmlFor="instagram" hint="Aparece no seu link de agendamento." error={errors.instagram}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">@</span>
              <Input
                id="instagram"
                name="instagram"
                defaultValue={defaults.instagram}
                placeholder="seuestudio"
                autoCapitalize="none"
                className="pl-8"
              />
            </div>
          </Field>

          <Field
            label="Endereço"
            htmlFor="addressLine"
            hint="Vai nas mensagens de confirmação, com o link do mapa."
            error={errors.addressLine}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={defaults.addressLine}
              placeholder="Rua, número, bairro — cidade/UF"
              autoComplete="street-address"
            />
          </Field>

          <Field
            label="Link do Google Maps"
            htmlFor="mapsUrl"
            hint="No Maps, toque em Compartilhar e cole o link aqui."
            error={errors.mapsUrl}
            className="sm:col-span-2"
          >
            <Input
              id="mapsUrl"
              name="mapsUrl"
              type="url"
              inputMode="url"
              defaultValue={defaults.mapsUrl}
              placeholder="https://maps.app.goo.gl/..."
            />
          </Field>
        </CardBody>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader title="Pix" description="Para o sinal, quando o Mercado Pago não está conectado." />
        <CardBody>
          <Field
            label="Chave Pix"
            htmlFor="pixKey"
            hint="Vai no Pix copia-e-cola do sinal que a cliente recebe."
            error={errors.pixKey}
          >
            <Input
              id="pixKey"
              name="pixKey"
              defaultValue={defaults.pixKey}
              placeholder="CPF, celular, e-mail ou chave aleatória"
            />
          </Field>
        </CardBody>
      </Card>

      <FormError error={state.error} />
      <button type="submit" className="sr-only">
        Salvar
      </button>
      <SavedToast savedAt={state.savedAt} message="Perfil salvo" />
    </form>
  );
}
