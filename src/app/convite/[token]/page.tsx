/**
 * Convite da equipe (público, liberado no proxy): a funcionária cria a senha
 * e já entra no app. O token só vale enquanto não venceu nem foi usado.
 */
import type { Metadata } from "next";
import { firstName } from "@/lib/team-shared";
import { buscarConvite } from "./data";
import { ConviteForm } from "./convite-form";
import { ConviteInvalido } from "./convite-invalido";

export const metadata: Metadata = {
  title: "Convite para a equipe",
  robots: { index: false, follow: false },
};

function MarcaDoEstudio({ src, studioName }: { src: string | null; studioName: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Logo de ${studioName}`}
        className="mx-auto h-14 w-14 rounded-[18px] bg-surface object-cover shadow-[var(--shadow-card)] ring-1 ring-line"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-accent text-[22px] font-bold text-accent-ink shadow-[var(--shadow-pop)]"
    >
      {studioName.trim().charAt(0).toUpperCase() || "L"}
    </span>
  );
}

export default async function ConvitePage(props: PageProps<"/convite/[token]">) {
  const { token } = await props.params;
  const convite = await buscarConvite(token);

  const estudio = convite?.professional;
  // Mesma regra do link público: uploads saem pela rota pública da logo.
  const logoSrc = estudio?.logoUrl
    ? estudio.logoUrl.startsWith("/api/uploads/")
      ? `/agendar/${estudio.slug}/logo`
      : estudio.logoUrl
    : null;

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        {convite && estudio ? (
          <>
            <div className="mb-9 text-center">
              <MarcaDoEstudio src={logoSrc} studioName={estudio.studioName} />
              <p className="mt-3 text-[13px] font-semibold text-ink-soft">{estudio.studioName}</p>
              <h1 className="mt-6 text-[30px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">
                Oi, {firstName(convite.name)}!
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                {firstName(estudio.name)} te chamou para a equipe do {estudio.studioName}. Crie sua
                senha para entrar.
              </p>
            </div>
            <ConviteForm token={token} email={convite.email} />
          </>
        ) : (
          <ConviteInvalido />
        )}
      </div>
    </div>
  );
}
