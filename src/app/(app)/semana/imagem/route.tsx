/**
 * Imagem 1080x1920 (stories) do resumo semanal — cores do estúdio,
 * gerada na hora pra profissional logada.
 */
import { ImageResponse } from "next/og";
import { requireProfessional } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { getResumoSemana } from "../dados";

export const dynamic = "force-dynamic";

export async function GET() {
  const professional = await requireProfessional();
  const resumo = await getResumoSemana(professional.id, professional.timezone);

  const accent = professional.accentColor;
  const bg = professional.backgroundColor;

  const stat = (valor: string, rotulo: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgba(255,255,255,0.82)",
        borderRadius: 40,
        padding: "38px 30px",
        width: 430,
      }}
    >
      <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#33261A" }}>
        {valor}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 30,
          color: "#6E5E45",
          marginTop: 6,
          textAlign: "center",
        }}
      >
        {rotulo}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "110px 70px",
          background: `linear-gradient(170deg, ${bg} 0%, ${bg} 45%, ${accent}55 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            letterSpacing: 8,
            textTransform: "uppercase",
            fontWeight: 700,
            color: accent,
          }}
        >
          Minha semana
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 700,
            color: "#33261A",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          {professional.studioName}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#6E5E45", marginTop: 8 }}>
          {resumo.periodo.de} — {resumo.periodo.ate}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: accent,
            borderRadius: 48,
            padding: "56px 70px",
            marginTop: 80,
            width: 900,
          }}
        >
          <div style={{ display: "flex", fontSize: 118, fontWeight: 700, color: "#FFFDF8" }}>
            {formatBRL(resumo.faturamentoCents)}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "rgba(255,253,248,0.9)" }}>
            de faturamento 💗
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 60,
            width: 900,
            justifyContent: "space-between",
          }}
        >
          {stat(String(resumo.atendimentos), "atendimentos")}
          {stat(String(resumo.novasClientes), "clientes novas")}
        </div>

        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", fontSize: 32, color: "#6E5E45" }}>
          feito com LashOS ✨
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
