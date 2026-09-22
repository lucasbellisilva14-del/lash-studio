/**
 * Preview do link público (WhatsApp/Instagram): imagem OG gerada na hora
 * com as cores e o nome de cada estúdio.
 */
import { ImageResponse } from "next/og";
import { getEstudioPorSlug } from "./data";

export const alt = "Agendamento online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const estudio = await getEstudioPorSlug(slug);

  const accent = estudio?.accentColor ?? "#D6336C";
  const bg = estudio?.backgroundColor ?? "#FFD9E9";
  const nome = estudio?.studioName ?? "LashOS";
  const inicial = nome.trim().charAt(0).toUpperCase() || "L";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(160deg, ${bg} 0%, ${bg} 55%, ${accent}33 100%)`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 14,
            background: accent,
            display: "flex",
          }}
        />
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 36,
            background: accent,
            color: "#FFFDF8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 68,
            fontWeight: 700,
            marginBottom: 34,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          }}
        >
          {inicial}
        </div>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
            marginBottom: 10,
            display: "flex",
          }}
        >
          Agendamento online
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            color: "#33261A",
            textAlign: "center",
            maxWidth: 1000,
            display: "flex",
          }}
        >
          {nome}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 30,
            color: "#6E5E45",
            display: "flex",
          }}
        >
          Escolha o serviço, o dia e o horário — em 1 minuto ✨
        </div>
      </div>
    ),
    { ...size },
  );
}
