/**
 * Recibo de atendimento: imagem 1080×1350 (feed) com as cores do estúdio.
 * Só a dona, só atendimentos concluídos do próprio estúdio.
 */
import { ImageResponse } from "next/og";
import { requireOwner, requireProfessional } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { carregarReciboImagem } from "../../data";

export const dynamic = "force-dynamic";

/** Texto escuro ou claro conforme o fundo. */
function tintaSobre(hex: string): { ink: string; soft: string } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { ink: "#17151E", soft: "rgba(23,21,30,0.62)" };
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6
    ? { ink: "#17151E", soft: "rgba(23,21,30,0.62)" }
    : { ink: "#FFFFFF", soft: "rgba(255,255,255,0.78)" };
}

export async function GET(_request: Request, ctx: RouteContext<"/ferramentas/recibo/[appointmentId]">) {
  await requireOwner();
  const professional = await requireProfessional();
  const { appointmentId } = await ctx.params;
  const recibo = await carregarReciboImagem(professional, appointmentId);
  if (!recibo) return new Response("Não encontrado", { status: 404 });

  const accent = recibo.accentColor;
  const bg = recibo.backgroundColor;
  const tintaFundo = tintaSobre(bg);
  const tintaAcento = tintaSobre(accent);

  const linha = (rotulo: string, valor: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 40,
        borderBottom: "2px solid rgba(23,21,30,0.08)",
        padding: "26px 0",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, color: "#6B6875" }}>{rotulo}</div>
      <div
        style={{
          display: "flex",
          fontSize: 36,
          fontWeight: 700,
          color: "#17151E",
          textAlign: "right",
          maxWidth: 620,
        }}
      >
        {valor}
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
          padding: "88px 72px",
          background: `linear-gradient(170deg, ${bg} 0%, ${bg} 55%, ${accent}66 100%)`,
        }}
      >
        {/* Cabeçalho: logo + nome do estúdio */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {recibo.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori só aceita <img>
            <img
              src={recibo.logoSrc}
              alt=""
              width={112}
              height={112}
              style={{ width: 112, height: 112, borderRadius: 28, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 112,
                height: 112,
                borderRadius: 28,
                background: accent,
                color: tintaAcento.ink,
                fontSize: 56,
                fontWeight: 700,
              }}
            >
              {recibo.studioName.trim().charAt(0).toUpperCase() || "L"}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 54,
              fontWeight: 700,
              color: tintaFundo.ink,
              letterSpacing: -1.5,
            }}
          >
            {recibo.studioName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 30,
            letterSpacing: 7,
            textTransform: "uppercase",
            fontWeight: 700,
            color: tintaFundo.soft,
          }}
        >
          Recibo de atendimento
        </div>

        {/* Cartão branco com os dados */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 936,
            marginTop: 40,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 44,
            padding: "24px 56px 32px",
          }}
        >
          {linha("Cliente", recibo.clienteNome)}
          {linha("Serviço", recibo.servicoNome)}
          {linha("Data", `${recibo.data} às ${recibo.hora}`)}
          {recibo.formaPagamento ? linha("Pagamento", recibo.formaPagamento) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              padding: "34px 0 8px",
            }}
          >
            <div style={{ display: "flex", fontSize: 30, color: "#6B6875" }}>Valor recebido</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: accent }}>
              {formatBRL(recibo.valorCents)}
            </div>
          </div>
        </div>

        {recibo.proximaManutencao ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 936,
              marginTop: 32,
              background: accent,
              borderRadius: 36,
              padding: "34px 40px",
            }}
          >
            <div style={{ display: "flex", fontSize: 28, color: tintaAcento.soft }}>
              Próxima manutenção sugerida
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 700,
                color: tintaAcento.ink,
                marginTop: 6,
              }}
            >
              {recibo.proximaManutencao}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", fontSize: 28, color: tintaFundo.soft }}>
          Obrigada pela confiança
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
