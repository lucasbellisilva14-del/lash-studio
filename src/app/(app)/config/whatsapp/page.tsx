import { prisma } from "@/lib/prisma";
import { requireOwner, requireProfessional } from "@/lib/session";
import { formatTime, localDayKey, localDayRange } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { firstName } from "@/lib/domain/templates";
import { QUEUE_KIND_LABELS } from "@/lib/domain/queue";
import type { TemplateKind } from "@/lib/constants";
import { whatsappDisponivel } from "@/lib/whatsapp/evolution";
import { sincronizarConexao } from "@/lib/whatsapp/conexao";
import { TIPOS_AUTOMATICOS, tiposLigados } from "@/lib/whatsapp/tipos";
import { PageHeader } from "@/components/ui/page-header";
import { WhatsappManager } from "./whatsapp-manager";

export const metadata = { title: "WhatsApp" };

/** Número gravado com 55 → (48) 99999-9999. */
function telefoneLegivel(phone: string | null): string | null {
  if (!phone) return null;
  const local = phone.startsWith("55") && phone.length > 11 ? phone.slice(2) : phone;
  return formatPhone(local);
}

export default async function WhatsappPage() {
  const { professionalId } = await requireOwner();
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const disponivel = whatsappDisponivel();

  const { conexao, instavel } = disponivel
    ? await sincronizarConexao(professionalId)
    : { conexao: await prisma.whatsAppConnection.findUnique({ where: { professionalId } }), instavel: false };

  const agora = new Date();
  const { start, end } = localDayRange(agora, tz);
  const recentes = await prisma.messageLog.findMany({
    where: { professionalId, auto: true, status: "ENVIADA", sentAt: { gte: start, lt: end } },
    select: { id: true, kind: true, sentAt: true, client: { select: { name: true } } },
    orderBy: { sentAt: "desc" },
    take: 6,
  });

  const conectado = conexao?.status === "CONECTADO";
  const ligados = conexao ? tiposLigados(conexao.autoKinds) : new Set(TIPOS_AUTOMATICOS);

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        subtitle="Confirmações e lembretes saindo sozinhos pelo seu número."
        backHref="/config"
      />
      <WhatsappManager
        disponivel={disponivel}
        conectado={conectado}
        instavel={instavel}
        telefone={telefoneLegivel(conexao?.phone ?? null)}
        perfil={conexao?.profileName ?? null}
        telefoneDoEstudio={professional.whatsapp ? formatPhone(professional.whatsapp) : ""}
        config={{
          autoSend: conexao?.autoSend ?? true,
          tipos: TIPOS_AUTOMATICOS.filter((t) => ligados.has(t)),
          limite: conexao?.dailyLimit ?? 60,
        }}
        enviadasHoje={conexao?.sentDay === localDayKey(agora, tz) ? conexao.sentToday : 0}
        recentes={recentes.map((log) => ({
          id: log.id,
          nome: firstName(log.client.name),
          tipo: QUEUE_KIND_LABELS[log.kind as TemplateKind] ?? "Mensagem",
          hora: log.sentAt ? formatTime(log.sentAt, tz) : "",
        }))}
      />
    </div>
  );
}
