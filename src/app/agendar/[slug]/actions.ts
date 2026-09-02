"use server";

/**
 * Server actions do link público de agendamento — SEM login.
 * O "tenant" é resolvido pelo slug do estúdio; toda consulta filtra
 * por professionalId a partir dele. Antecedência mínima SEMPRE vale
 * aqui (sem skipAdvanceCheck) e toda violação de slot bloqueia.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { formatDate, localDayRange, localToUtc } from "@/lib/dates";
import { isValidPhone, normalizePhone, waLink } from "@/lib/phone";
import { freeSlotsForDay, validateSlot } from "@/lib/domain/scheduling";
import { computeDeposit } from "@/lib/domain/deposit";
import { buildPixPayload } from "@/lib/pix";
import type {
  HorariosPublicosResult,
  SolicitacaoResult,
  SolicitacaoSucesso,
} from "@/components/agendar/types";
import {
  getEstudioPorSlug,
  getGradePublica,
  getOcupacoesPublicasDoDia,
  timestampValido,
} from "./data";

const MAX_POR_TELEFONE_DIA = 3;
const MAX_POR_ESTUDIO_DIA = 20;

const slugSchema = z.string().trim().min(1).max(80);
const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");

/* ------------------------------------------------------------------ */
/* Horários livres (respeitando a antecedência mínima do estúdio)      */
/* ------------------------------------------------------------------ */

const horariosPublicosSchema = z.object({
  slug: slugSchema,
  dia: diaSchema,
  servicoId: z.string().min(1),
});

export async function horariosPublicos(
  input: z.infer<typeof horariosPublicosSchema>,
): Promise<HorariosPublicosResult> {
  const parsed = horariosPublicosSchema.safeParse(input);
  if (!parsed.success) return { slots: [] };
  const { slug, dia, servicoId } = parsed.data;

  const estudio = await getEstudioPorSlug(slug);
  if (!estudio) return { slots: [] };

  const service = await prisma.service.findFirst({
    where: { id: servicoId, professionalId: estudio.id, active: true },
  });
  if (!service) return { slots: [] };

  const tz = estudio.timezone;
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradePublica(estudio.id),
    getOcupacoesPublicasDoDia(estudio.id, dia, tz),
  ]);

  const slots = freeSlotsForDay({
    dayKey: dia,
    durationMin: service.durationMin,
    bufferMinutes: estudio.bufferMinutes,
    minAdvanceHours: estudio.minAdvanceHours, // público respeita a antecedência
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
  });
  return { slots };
}

/* ------------------------------------------------------------------ */
/* Criação da solicitação                                              */
/* ------------------------------------------------------------------ */

const criarSolicitacaoSchema = z.object({
  slug: slugSchema,
  servicoId: z.string().min(1),
  dia: diaSchema,
  hora: horaSchema,
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(80)
    .regex(/\p{L}\p{L}/u, "Informe seu nome completo."),
  whatsapp: z.string().min(8, "Informe seu WhatsApp.").max(25),
  /** Honeypot — humano nunca preenche. */
  site: z.string().optional(),
  ts: z.number(),
  assinatura: z.string().min(1).max(64),
});

function erroDados(mensagem: string): SolicitacaoResult {
  return { ok: false, erro: mensagem, codigo: "DADOS" };
}

export async function criarSolicitacao(
  input: z.infer<typeof criarSolicitacaoSchema>,
): Promise<SolicitacaoResult> {
  const parsed = criarSolicitacaoSchema.safeParse(input);
  if (!parsed.success) {
    return erroDados(parsed.error.issues[0]?.message ?? "Confira os dados e tente de novo.");
  }
  const { slug, servicoId, dia, hora, nome, whatsapp, site, ts, assinatura } = parsed.data;

  const estudio = await getEstudioPorSlug(slug);
  if (!estudio) return erroDados("Estúdio não encontrado. Confira o link e tente de novo.");
  const tz = estudio.timezone;

  const service = await prisma.service.findFirst({
    where: { id: servicoId, professionalId: estudio.id, active: true },
  });
  if (!service) {
    return erroDados("Esse serviço não está mais disponível — recarregue a página.");
  }

  // Honeypot preenchido: finge sucesso e não grava nada.
  if (site && site.trim() !== "") {
    return {
      ok: true,
      sucesso: {
        servico: service.name,
        data: formatDate(localToUtc(dia, hora, tz), tz),
        hora,
        valorCents: service.priceCents,
        sinal: null,
      },
    };
  }

  // Envio rápido demais (menos de 3s) ou token adulterado/vencido.
  if (!timestampValido(slug, ts, assinatura)) {
    return erroDados(
      "Não conseguimos confirmar o envio. Recarregue a página e tente novamente.",
    );
  }

  if (!isValidPhone(whatsapp)) {
    return erroDados("WhatsApp inválido — use DDD + número (ex.: 48 99999-8888).");
  }
  const telefone = normalizePhone(whatsapp);

  // Limites do dia (anti-spam sem serviços pagos).
  const { start: inicioDia, end: fimDia } = localDayRange(new Date(), tz);
  const [totalEstudio, totalTelefone] = await Promise.all([
    prisma.appointment.count({
      where: {
        professionalId: estudio.id,
        source: "PUBLICO",
        createdAt: { gte: inicioDia, lt: fimDia },
      },
    }),
    prisma.appointment.count({
      where: {
        professionalId: estudio.id,
        source: "PUBLICO",
        createdAt: { gte: inicioDia, lt: fimDia },
        client: { phone: telefone },
      },
    }),
  ]);
  if (totalEstudio >= MAX_POR_ESTUDIO_DIA) {
    return {
      ok: false,
      codigo: "LIMITE",
      erro: "A agenda online está cheia por hoje. Chame o estúdio no WhatsApp para combinar seu horário.",
    };
  }
  if (totalTelefone >= MAX_POR_TELEFONE_DIA) {
    return {
      ok: false,
      codigo: "LIMITE",
      erro: "Você já enviou solicitações demais hoje. Aguarde a confirmação do estúdio ou chame no WhatsApp.",
    };
  }

  // Revalida o slot — aqui TODA violação bloqueia, inclusive antecedência.
  const startAt = localToUtc(dia, hora, tz);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradePublica(estudio.id),
    getOcupacoesPublicasDoDia(estudio.id, dia, tz),
  ]);
  const violations = validateSlot({
    startAt,
    durationMin: service.durationMin,
    bufferMinutes: estudio.bufferMinutes,
    minAdvanceHours: estudio.minAdvanceHours,
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
  });
  if (violations.length > 0) {
    const code = violations[0].code;
    const mensagem =
      code === "CONFLITO" || code === "BUFFER"
        ? "Esse horário acabou de ser preenchido — escolha outro, por favor."
        : code === "ANTECEDENCIA"
          ? `Esse horário precisa de pelo menos ${estudio.minAdvanceHours}h de antecedência — escolha outro.`
          : "O estúdio não atende nesse horário — escolha outro, por favor.";
    return { ok: false, erro: mensagem, codigo: "HORARIO" };
  }

  // Cliente: reaproveita pelo telefone ou cria com origem do link.
  let cliente = await prisma.client.findFirst({
    where: { professionalId: estudio.id, phone: telefone },
  });
  if (!cliente) {
    cliente = await prisma.client.create({
      data: {
        professionalId: estudio.id,
        name: nome,
        phone: telefone,
        source: "OUTRO",
        notes: "Veio pelo link de agendamento",
      },
    });
  }

  // Sinal: política do estúdio + histórico de faltas da cliente.
  const sinal = computeDeposit({
    policy: {
      depositType: estudio.depositType,
      depositValue: estudio.depositValue,
      noShowThreshold: estudio.noShowThreshold,
    },
    serviceRequiresDeposit: service.requiresDeposit,
    clientNoShowCount: cliente.noShowCount,
    priceCents: service.priceCents,
  });

  await prisma.appointment.create({
    data: {
      professionalId: estudio.id,
      clientId: cliente.id,
      serviceId: service.id,
      startAt,
      endAt,
      status: "PRE_AGENDADO",
      priceCents: service.priceCents,
      depositRequired: sinal.required,
      depositCents: sinal.required ? sinal.depositCents : null,
      source: "PUBLICO",
    },
  });

  const dataFmt = formatDate(startAt, tz);
  let sucessoSinal: SolicitacaoSucesso["sinal"] = null;
  if (sinal.required && sinal.depositCents > 0) {
    sucessoSinal = {
      valorCents: sinal.depositCents,
      pixCodigo: estudio.pixKey
        ? buildPixPayload({
            pixKey: estudio.pixKey,
            merchantName: estudio.studioName,
            amountCents: sinal.depositCents,
          })
        : null,
      waComprovanteUrl: estudio.whatsapp
        ? waLink(
            estudio.whatsapp,
            `Oi! Acabei de solicitar horário para ${service.name} dia ${dataFmt} às ${hora} e vou enviar o comprovante do sinal.`,
          )
        : null,
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/");

  return {
    ok: true,
    sucesso: {
      servico: service.name,
      data: dataFmt,
      hora,
      valorCents: service.priceCents,
      sinal: sucessoSinal,
    },
  };
}
