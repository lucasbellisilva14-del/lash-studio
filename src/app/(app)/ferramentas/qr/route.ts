/**
 * PNG (1024 px) do QR code do link de agendamento da profissional logada.
 * Baixado pela aba Divulgação.
 */
import QRCode from "qrcode";
import { requireOwner, requireProfessional } from "@/lib/session";
import { getBookingUrl } from "@/lib/domain/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireOwner();
  const professional = await requireProfessional();
  const link = await getBookingUrl(professional.slug);
  const png = await QRCode.toBuffer(link, { type: "png", width: 1024, margin: 2 });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": 'attachment; filename="qr-agendamento.png"',
      "Cache-Control": "private, no-store",
    },
  });
}
