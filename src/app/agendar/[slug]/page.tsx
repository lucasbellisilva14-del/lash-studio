import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPhone, waLink } from "@/lib/phone";
import type { ServiceCategory } from "@/lib/constants";
import { BookingFlow } from "@/components/agendar/booking-flow";
import { StudioLogo } from "@/components/agendar/studio-logo";
import { IconInstagram, IconMapPin } from "@/components/agendar/icons";
import { IconWhatsApp } from "@/components/ui/icons";
import type { AgendarServico } from "@/components/agendar/types";
import {
  assinarTimestamp,
  getEstudioPorSlug,
  getGradePublica,
  montarDiasDisponiveis,
} from "./data";

export async function generateMetadata(
  props: PageProps<"/agendar/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const estudio = await getEstudioPorSlug(slug);
  if (!estudio) return { title: "Estúdio não encontrado" };
  return {
    title: { absolute: `${estudio.studioName} — Agendar horário` },
    description: `Agende seu horário no ${estudio.studioName} pelo link oficial do estúdio.`,
  };
}

const CHIP_LINK =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 " +
  "text-xs font-medium text-ink-soft hover:bg-surface-sunken transition-colors max-w-full";

export default async function AgendarPage(props: PageProps<"/agendar/[slug]">) {
  await connection(); // página sempre fresca: horários, serviços e token anti-spam
  const { slug } = await props.params;
  const estudio = await getEstudioPorSlug(slug);
  if (!estudio) notFound();

  const [servicosDb, { workingHours }] = await Promise.all([
    prisma.service.findMany({
      where: { professionalId: estudio.id, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    getGradePublica(estudio.id),
  ]);

  const servicos: AgendarServico[] = servicosDb.map((s) => ({
    id: s.id,
    nome: s.name,
    categoria: s.category as ServiceCategory,
    duracaoMin: s.durationMin,
    precoCents: s.priceCents,
    exigeSinal: s.requiresDeposit,
  }));

  const dias = montarDiasDisponiveis(workingHours, estudio.timezone);
  const ts = Date.now();
  const token = { ts, assinatura: assinarTimestamp(slug, ts) };

  const logoSrc = estudio.logoUrl
    ? estudio.logoUrl.startsWith("/api/uploads/")
      ? `/agendar/${slug}/logo`
      : estudio.logoUrl
    : null;

  const mapsHref =
    estudio.mapsUrl ||
    (estudio.addressLine
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(estudio.addressLine)}`
      : null);

  return (
    <div
      className="accent-scope min-h-dvh bg-background"
      style={{ ["--accent" as string]: estudio.accentColor }}
    >
      <div className="h-1.5 w-full bg-accent" aria-hidden />
      <main className="mx-auto w-full max-w-lg px-4 pb-12 pt-8">
        <header className="text-center mb-8">
          <StudioLogo src={logoSrc} nome={estudio.studioName} />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
            Agendamento online
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink mt-1">
            {estudio.studioName}
          </h1>
          {estudio.addressLine || estudio.instagram || estudio.whatsapp ? (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {estudio.addressLine ? (
                mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={CHIP_LINK}
                  >
                    <IconMapPin width={14} height={14} className="shrink-0 text-accent-strong" />
                    <span className="truncate">{estudio.addressLine}</span>
                  </a>
                ) : (
                  <span className={CHIP_LINK}>
                    <IconMapPin width={14} height={14} className="shrink-0 text-accent-strong" />
                    <span className="truncate">{estudio.addressLine}</span>
                  </span>
                )
              ) : null}
              {estudio.instagram ? (
                <a
                  href={`https://instagram.com/${estudio.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CHIP_LINK}
                >
                  <IconInstagram width={14} height={14} className="shrink-0 text-accent-strong" />
                  @{estudio.instagram}
                </a>
              ) : null}
              {estudio.whatsapp ? (
                <a
                  href={waLink(estudio.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CHIP_LINK}
                >
                  <IconWhatsApp width={14} height={14} className="shrink-0 text-accent-strong" />
                  {formatPhone(estudio.whatsapp)}
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        <BookingFlow
          estudio={{
            slug,
            nome: estudio.studioName,
            whatsapp: estudio.whatsapp,
            minAdvanceHours: estudio.minAdvanceHours,
          }}
          servicos={servicos}
          dias={dias}
          token={token}
        />

        <footer className="mt-12 text-center text-xs text-ink-faint">
          Agendamento online de {estudio.studioName} · feito com{" "}
          <span className="font-medium">LashOS</span>
        </footer>
      </main>
    </div>
  );
}
