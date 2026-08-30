/**
 * LGPD — portabilidade: exporta todos os dados da cliente em JSON
 * (download com Content-Disposition: attachment). Só a dona da conta acessa.
 */
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { formatDate, formatDateTime, localDayKey } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { formatBRL } from "@/lib/money";
import {
  APPOINTMENT_STATUSES,
  CLIENT_SOURCES,
  NATURAL_LASH_CONDITIONS,
  TECHNIQUES,
  TEMPLATE_KINDS,
} from "@/lib/constants";
import {
  contraindicationLabel,
  parseContraindicationFlags,
} from "@/components/clientes/contraindications";

function labelOf(map: Record<string, string>, key: string | null | undefined): string | null {
  if (!key) return null;
  return map[key] ?? key;
}

function safeParseJson(json: string | null | undefined): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cliente"
  );
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/clientes/[id]/exportar">,
) {
  const professional = await requireProfessional();
  const tz = professional.timezone;
  const { id } = await ctx.params;

  const client = await prisma.client.findFirst({
    where: { id, professionalId: professional.id },
    include: {
      anamnesisForm: true,
      appointments: {
        include: { service: true, attendanceRecord: true },
        orderBy: { startAt: "desc" },
      },
      photos: { orderBy: { createdAt: "desc" } },
      messageLogs: { orderBy: { createdAt: "desc" } },
      consentSignatures: { orderBy: { signedAt: "desc" } },
    },
  });
  if (!client) return new Response("Não encontrado", { status: 404 });

  const form = client.anamnesisForm;
  const messageKindLabels: Record<string, string> = {
    ...TEMPLATE_KINDS,
    LIVRE: "Mensagem avulsa",
  };

  const payload = {
    exportadoEm: new Date().toISOString(),
    origem: "LashOS — exportação de dados da cliente (LGPD)",
    cadastro: {
      nome: client.name,
      telefone: formatPhone(client.phone),
      instagram: client.instagram,
      dataDeNascimento: client.birthDate ? formatDate(client.birthDate, tz) : null,
      comoConheceu: labelOf(CLIENT_SOURCES, client.source),
      observacoes: client.notes,
      faltas: client.noShowCount,
      cancelamentosTardios: client.lateCancelCount,
      cadastradaEm: formatDate(client.createdAt, tz),
    },
    anamnese: form
      ? {
          respostas: safeParseJson(form.answersJson),
          contraindicacoes: parseContraindicationFlags(form.contraindicationFlags).map(
            contraindicationLabel,
          ),
          condicaoDosFiosNaturais: labelOf(
            NATURAL_LASH_CONDITIONS,
            form.naturalLashCondition,
          ),
          consentimentoLgpd: form.lgpdConsent,
          preenchidaEm: formatDate(form.createdAt, tz),
          atualizadaEm: formatDate(form.updatedAt, tz),
        }
      : null,
    atendimentos: client.appointments.map((a) => ({
      data: formatDateTime(a.startAt, tz),
      servico: a.service.name,
      status: labelOf(APPOINTMENT_STATUSES, a.status),
      valor: formatBRL(a.priceCents),
      sinal: a.depositCents != null ? formatBRL(a.depositCents) : null,
      observacoes: a.notes,
      fichaTecnica: a.attendanceRecord
        ? {
            tecnica: labelOf(TECHNIQUES, a.attendanceRecord.technique),
            volume: a.attendanceRecord.volumeFactor,
            curvaturas: a.attendanceRecord.curvatures,
            espessura: a.attendanceRecord.thickness,
            mapping: safeParseJson(a.attendanceRecord.mappingJson),
            cola: a.attendanceRecord.glueBrand,
            loteCola: a.attendanceRecord.glueBatch,
            retencaoPct: a.attendanceRecord.retentionPct,
            duracaoMin: a.attendanceRecord.durationMin,
            observacoes: a.attendanceRecord.notes,
          }
        : null,
    })),
    fotos: client.photos.map((p) => ({
      tipo: p.kind,
      chaveDoArquivo: p.storageKey,
      data: formatDate(p.createdAt, tz),
    })),
    mensagens: client.messageLogs.map((m) => ({
      tipo: messageKindLabels[m.kind] ?? m.kind,
      canal: m.channel,
      corpo: m.body,
      status: m.status,
      data: formatDateTime(m.sentAt ?? m.createdAt, tz),
    })),
    assinaturasDeConsentimento: client.consentSignatures.map((s) => ({
      chaveDoArquivo: s.imageKey,
      termo: s.consentText,
      assinadaEm: formatDateTime(s.signedAt, tz),
    })),
  };

  const filename = `dados-${slugify(client.name)}-${localDayKey(new Date(), tz)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
