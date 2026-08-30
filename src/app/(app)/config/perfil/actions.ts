"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessionalId } from "@/lib/session";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  getStorageProvider,
  newStorageKey,
  storageKeyOwner,
} from "@/lib/providers/storage";
import { type ConfigFormState, fieldErrorsFrom } from "../form-state";

const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(2, "Informe o seu nome.").max(80, "Nome muito longo."),
  studioName: z
    .string()
    .trim()
    .min(2, "Informe o nome do estúdio.")
    .max(80, "Nome do estúdio muito longo."),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida — escolha uma da paleta."),
  addressLine: z.string().trim().max(180, "Endereço muito longo."),
  mapsUrl: z
    .string()
    .trim()
    .max(300, "Link muito longo.")
    .refine(
      (v) => v === "" || /^https?:\/\/\S+$/i.test(v),
      "O link do Maps deve começar com http:// ou https://.",
    ),
  whatsapp: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || isValidPhone(v),
      "WhatsApp inválido — use DDD + número, ex.: (48) 99999-8888.",
    ),
  instagram: z.string().trim().max(60, "Usuário do Instagram muito longo."),
  pixKey: z.string().trim().max(140, "Chave Pix muito longa."),
});

export async function salvarPerfilAction(
  _prev: ConfigFormState,
  formData: FormData,
): Promise<ConfigFormState> {
  const professionalId = await requireProfessionalId();

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    studioName: String(formData.get("studioName") ?? ""),
    accentColor: String(formData.get("accentColor") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    mapsUrl: String(formData.get("mapsUrl") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    instagram: String(formData.get("instagram") ?? ""),
    pixKey: String(formData.get("pixKey") ?? ""),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revise os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const v = parsed.data;

  // Logo (opcional): valida tipo/tamanho e grava no storage do tenant.
  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!LOGO_TYPES.includes(logo.type)) {
      return {
        ok: false,
        fieldErrors: { logo: "Formato não suportado — envie JPG, PNG ou WebP." },
        error: "Revise os campos destacados.",
      };
    }
    if (logo.size > LOGO_MAX_BYTES) {
      return {
        ok: false,
        fieldErrors: { logo: "A imagem deve ter no máximo 5MB." },
        error: "Revise os campos destacados.",
      };
    }
    const key = newStorageKey(professionalId, "logo", logo.type);
    await getStorageProvider().put(
      key,
      Buffer.from(await logo.arrayBuffer()),
      logo.type,
    );
    logoUrl = `/api/uploads/${key}`;
  }

  try {
    const current = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { logoUrl: true },
    });

    await prisma.professional.update({
      where: { id: professionalId },
      data: {
        name: v.name,
        studioName: v.studioName,
        accentColor: v.accentColor.toUpperCase(),
        addressLine: v.addressLine || null,
        mapsUrl: v.mapsUrl || null,
        whatsapp: v.whatsapp ? normalizePhone(v.whatsapp) : null,
        instagram: v.instagram ? v.instagram.replace(/^@+/, "") : null,
        pixKey: v.pixKey || null,
        ...(logoUrl ? { logoUrl } : {}),
        onboardingDone: true,
      },
    });

    // Remove a logo antiga do storage (higiene) — só se era deste tenant.
    const oldUrl = current?.logoUrl;
    if (logoUrl && oldUrl?.startsWith("/api/uploads/") && oldUrl !== logoUrl) {
      const oldKey = oldUrl.slice("/api/uploads/".length);
      if (storageKeyOwner(oldKey) === professionalId) {
        await getStorageProvider().delete(oldKey);
      }
    }
  } catch {
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  // Cor de acento e logo aparecem no app inteiro.
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
