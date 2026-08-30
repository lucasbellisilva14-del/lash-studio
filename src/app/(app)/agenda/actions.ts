"use server";

/** Server actions da Agenda — todas exigem sessão e filtram por professionalId. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { formatDateLong, formatTime, localToUtc, formatDate } from "@/lib/dates";
import { isValidPhone, normalizePhone, waLink } from "@/lib/phone";
import { freeSlotsForDay, validateSlot } from "@/lib/domain/scheduling";
import { checkMaintenanceWindow } from "@/lib/domain/maintenance";
import { computeDeposit } from "@/lib/domain/deposit";
import { getLastLashAppointment } from "@/lib/domain/cycle";
import {
  getGradeAgenda,
  getOcupacoesDoDia,
  toAgendaCliente,
} from "./data";
import type { AgendaCliente, EsperaChamada } from "@/components/agenda/types";

const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");

/* ------------------------------------------------------------------ */
/* Consultas (chamadas pelo fluxo de criação/reagendamento)            */
/* ------------------------------------------------------------------ */

const horariosLivresSchema = z.object({
  dia: diaSchema,
  servicoId: z.string().min(1),
  ignorarId: z.string().optional(),
});

export async function horariosLivres(
  input: z.infer<typeof horariosLivresSchema>,
): Promise<{ slots: string[] }> {
  const professional = await requireProfessional();
  const parsed = horariosLivresSchema.safeParse(input);
  if (!parsed.success) return { slots: [] };
  const { dia, servicoId, ignorarId } = parsed.data;

  const service = await prisma.service.findFirst({
    where: { id: servicoId, professionalId: professional.id },
  });
  if (!service) return { slots: [] };

  const tz = professional.timezone;
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id),
    getOcupacoesDoDia(professional.id, dia, tz),
  ]);

  const slots = freeSlotsForDay({
    dayKey: dia,
    durationMin: service.durationMin,
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: 0, // uso interno: antecedência não bloqueia sugestões
    timezone: tz,
    workingHours,
    blocks,
    appointments: ignorarId
      ? ocupacoes.filter((o) => o.id !== ignorarId)
      : ocupacoes,
  });

  // Sem antecedência mínima, mas horário que já passou não é sugestão útil.
  const agora = new Date();
  return { slots: slots.filter((s) => localToUtc(dia, s, tz) > agora) };
}

export type AvisoManutencao = {
  message: string;
  sugestao: {
    id: string;
    nome: string;
    precoCents: number;
    duracaoMin: number;
    exigeSinal: boolean;
  } | null;
} | null;

const verificarManutencaoSchema = z.object({
  clienteId: z.string().min(1),
  servicoId: z.string().min(1),
  dia: diaSchema,
});

/** Regra de ouro: manutenção fora do prazo (ou sem aplicação) vira aplicação nova. */
export async function verificarManutencao(
  input: z.infer<typeof verificarManutencaoSchema>,
): Promise<AvisoManutencao> {
  const professional = await requireProfessional();
  const parsed = verificarManutencaoSchema.safeParse(input);
  if (!parsed.success) return null;
  const { clienteId, servicoId, dia } = parsed.data;

  const [client, service] = await Promise.all([
    prisma.client.findFirst({ where: { id: clienteId, professionalId: professional.id } }),
    prisma.service.findFirst({ where: { id: servicoId, professionalId: professional.id } }),
  ]);
  if (!client || !service || service.category !== "MANUTENCAO") return null;

  const last = await getLastLashAppointment(client.id);
  const check = checkMaintenanceWindow({
    lastLashAt: last?.startAt ?? null,
    limitDays: professional.maintenanceLimitDays,
    targetDate: localToUtc(dia, "12:00", professional.timezone),
    suggestedServiceId: service.maintenanceOfId,
    timezone: professional.timezone,
  });
  if (check.ok) return null;

  let sugestao: NonNullable<AvisoManutencao>["sugestao"] = null;
  if (check.suggestedServiceId) {
    const sugerido = await prisma.service.findFirst({
      where: { id: check.suggestedServiceId, professionalId: professional.id, active: true },
    });
    if (sugerido) {
      sugestao = {
        id: sugerido.id,
        nome: sugerido.name,
        precoCents: sugerido.priceCents,
        duracaoMin: sugerido.durationMin,
        exigeSinal: sugerido.requiresDeposit,
      };
    }
  }
  return { message: check.message, sugestao };
}

/* ------------------------------------------------------------------ */
/* Cadastro rápido de cliente                                          */
/* ------------------------------------------------------------------ */

const clienteRapidoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da cliente."),
  whatsapp: z.string().min(8, "Informe o WhatsApp."),
});

export type ClienteRapidoResult =
  | { ok: true; cliente: AgendaCliente }
  | { ok: false; erro: string };

export async function criarClienteRapido(input: {
  nome: string;
  whatsapp: string;
}): Promise<ClienteRapidoResult> {
  const professional = await requireProfessional();
  const parsed = clienteRapidoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!isValidPhone(parsed.data.whatsapp)) {
    return { ok: false, erro: "WhatsApp inválido — use DDD + número (ex.: 48 99999-8888)." };
  }
  const phone = normalizePhone(parsed.data.whatsapp);

  const existente = await prisma.client.findFirst({
    where: { professionalId: professional.id, phone },
  });
  if (existente) {
    return { ok: false, erro: `Já existe uma cliente com esse WhatsApp: ${existente.name}.` };
  }

  const created = await prisma.client.create({
    data: { professionalId: professional.id, name: parsed.data.nome, phone },
  });
  revalidatePath("/agenda");
  return {
    ok: true,
    cliente: toAgendaCliente({
      id: created.id,
      name: created.name,
      phone: created.phone,
      noShowCount: created.noShowCount,
      anamnesisForm: null,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Criação de agendamento                                              */
/* ------------------------------------------------------------------ */

const criarAgendamentoSchema = z.object({
  clienteId: z.string().min(1),
  servicoId: z.string().min(1),
  dia: diaSchema,
  hora: horaSchema,
  observacoes: z.string().trim().max(500).optional(),
});

export type CriarAgendamentoResult =
  | { ok: true; id: string; status: string; aviso: string | null }
  | { ok: false; erro: string };

export async function criarAgendamento(
  input: z.infer<typeof criarAgendamentoSchema>,
): Promise<CriarAgendamentoResult> {
  const professional = await requireProfessional();
  const parsed = criarAgendamentoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { clienteId, servicoId, dia, hora, observacoes } = parsed.data;
  const tz = professional.timezone;

  const [client, service] = await Promise.all([
    prisma.client.findFirst({ where: { id: clienteId, professionalId: professional.id } }),
    prisma.service.findFirst({
      where: { id: servicoId, professionalId: professional.id, active: true },
    }),
  ]);
  if (!client) return { ok: false, erro: "Cliente não encontrada." };
  if (!service) return { ok: false, erro: "Serviço não encontrado ou inativo." };

  const startAt = localToUtc(dia, hora, tz);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id),
    getOcupacoesDoDia(professional.id, dia, tz),
  ]);

  const violations = validateSlot({
    startAt,
    durationMin: service.durationMin,
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: professional.minAdvanceHours,
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
  });
  const bloqueantes = violations.filter((v) => v.code !== "ANTECEDENCIA");
  if (bloqueantes.length > 0) {
    return { ok: false, erro: bloqueantes[0].message };
  }
  const avisos: string[] = violations
    .filter((v) => v.code === "ANTECEDENCIA")
    .map((v) => `${v.message} Como o agendamento é interno, ele foi criado mesmo assim.`);

  // Regra de ouro da manutenção — não bloqueia, mas registra o aviso.
  if (service.category === "MANUTENCAO") {
    const last = await getLastLashAppointment(client.id);
    const check = checkMaintenanceWindow({
      lastLashAt: last?.startAt ?? null,
      limitDays: professional.maintenanceLimitDays,
      targetDate: startAt,
      suggestedServiceId: service.maintenanceOfId,
      timezone: tz,
    });
    if (!check.ok) avisos.push(check.message);
  }

  const sinal = computeDeposit({
    policy: {
      depositType: professional.depositType,
      depositValue: professional.depositValue,
      noShowThreshold: professional.noShowThreshold,
    },
    serviceRequiresDeposit: service.requiresDeposit,
    clientNoShowCount: client.noShowCount,
    priceCents: service.priceCents,
  });

  const status = sinal.required ? "PRE_AGENDADO" : "CONFIRMADO";
  const created = await prisma.appointment.create({
    data: {
      professionalId: professional.id,
      clientId: client.id,
      serviceId: service.id,
      startAt,
      endAt,
      status,
      priceCents: service.priceCents,
      depositRequired: sinal.required,
      depositCents: sinal.required ? sinal.depositCents : null,
      notes: observacoes || null,
      source: "INTERNO",
    },
  });

  if (sinal.required) {
    const motivo =
      sinal.reason === "NO_SHOW"
        ? `cliente com ${client.noShowCount} falta${client.noShowCount === 1 ? "" : "s"}`
        : "o serviço exige sinal";
    avisos.push(
      `Sinal de ${formatBRL(sinal.depositCents)} exigido (${motivo}). O horário fica pré-agendado até o sinal ser recebido.`,
    );
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, id: created.id, status, aviso: avisos.length ? avisos.join(" ") : null };
}

/* ------------------------------------------------------------------ */
/* Ações sobre um agendamento existente                                */
/* ------------------------------------------------------------------ */

export type AcaoResult = { ok: true } | { ok: false; erro: string };

async function getAgendamentoDaProfissional(id: string, professionalId: string) {
  return prisma.appointment.findFirst({
    where: { id, professionalId },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
    },
  });
}

export async function sinalRecebido(id: string): Promise<AcaoResult> {
  const professional = await requireProfessional();
  const appt = await getAgendamentoDaProfissional(id, professional.id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO") {
    return { ok: false, erro: "Só agendamentos pré-agendados aguardam sinal." };
  }
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CONFIRMADO", depositPaidAt: new Date() },
  });
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function concluirAgendamento(id: string): Promise<AcaoResult> {
  const professional = await requireProfessional();
  const appt = await getAgendamentoDaProfissional(id, professional.id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO" && appt.status !== "CONFIRMADO") {
    return { ok: false, erro: "Esse agendamento não pode ser concluído." };
  }
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CONCLUIDO" },
  });
  revalidatePath("/agenda");
  revalidatePath("/");
  redirect(`/atendimentos/${appt.id}`);
}

export async function marcarFalta(id: string): Promise<AcaoResult> {
  const professional = await requireProfessional();
  const appt = await getAgendamentoDaProfissional(id, professional.id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO" && appt.status !== "CONFIRMADO") {
    return { ok: false, erro: "Esse agendamento não pode ser marcado como falta." };
  }
  await prisma.$transaction([
    prisma.appointment.update({ where: { id: appt.id }, data: { status: "FALTOU" } }),
    prisma.client.update({
      where: { id: appt.clientId },
      data: { noShowCount: { increment: 1 } },
    }),
  ]);
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

/** Entradas ATIVAS da lista de espera cujo período cobre o horário liberado. */
async function buscarEsperaParaHorario(
  professionalId: string,
  horario: Date,
  tz: string,
  servicoNome: string | null,
): Promise<EsperaChamada[]> {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      professionalId,
      status: "ATIVA",
      AND: [
        { OR: [{ dateFrom: null }, { dateFrom: { lte: horario } }] },
        { OR: [{ dateTo: null }, { dateTo: { gte: horario } }] },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { client: { select: { name: true, phone: true } } },
  });

  const quando = `${formatDateLong(horario, tz)} às ${formatTime(horario, tz)}`;
  return entries.map((e) => {
    const primeiroNome = e.client.name.split(" ")[0];
    const servico = servicoNome ? ` para ${servicoNome}` : "";
    const msg = `Oi, ${primeiroNome}! Abriu um horário aqui no estúdio${servico}: ${quando}. Quer aproveitar? Me confirma que eu já reservo pra você.`;
    let periodo: string | null = e.periodNote;
    if (!periodo && (e.dateFrom || e.dateTo)) {
      const de = e.dateFrom ? formatDate(e.dateFrom, tz) : null;
      const ate = e.dateTo ? formatDate(e.dateTo, tz) : null;
      periodo = de && ate ? `${de} a ${ate}` : de ? `a partir de ${de}` : `até ${ate}`;
    }
    return {
      id: e.id,
      nome: e.client.name,
      telefone: e.client.phone,
      periodo,
      waUrl: waLink(e.client.phone, msg),
    };
  });
}

export type CancelamentoResult =
  | { ok: true; status: string; espera: EsperaChamada[] }
  | { ok: false; erro: string };

export async function cancelarAgendamento(id: string): Promise<CancelamentoResult> {
  const professional = await requireProfessional();
  const appt = await getAgendamentoDaProfissional(id, professional.id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO" && appt.status !== "CONFIRMADO") {
    return { ok: false, erro: "Esse agendamento não pode ser cancelado." };
  }

  const agora = new Date();
  const limiteMs = professional.cancellationWindowHours * 3_600_000;
  const tardio = appt.startAt.getTime() - agora.getTime() < limiteMs;

  if (tardio) {
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appt.id },
        data: { status: "CANCELADO_TARDE" },
      }),
      prisma.client.update({
        where: { id: appt.clientId },
        data: { lateCancelCount: { increment: 1 } },
      }),
    ]);
  } else {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELADO" },
    });
  }

  const espera = await buscarEsperaParaHorario(
    professional.id,
    appt.startAt,
    professional.timezone,
    appt.service.name,
  );

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, status: tardio ? "CANCELADO_TARDE" : "CANCELADO", espera };
}

const reagendarSchema = z.object({
  id: z.string().min(1),
  dia: diaSchema,
  hora: horaSchema,
});

export type ReagendarResult =
  | { ok: true; espera: EsperaChamada[] }
  | { ok: false; erro: string };

export async function reagendarAgendamento(
  input: z.infer<typeof reagendarSchema>,
): Promise<ReagendarResult> {
  const professional = await requireProfessional();
  const parsed = reagendarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, dia, hora } = parsed.data;
  const tz = professional.timezone;

  const appt = await prisma.appointment.findFirst({
    where: { id, professionalId: professional.id },
    include: { service: { select: { name: true, durationMin: true } } },
  });
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO" && appt.status !== "CONFIRMADO") {
    return { ok: false, erro: "Esse agendamento não pode ser reagendado." };
  }

  const startAt = localToUtc(dia, hora, tz);
  const endAt = new Date(startAt.getTime() + appt.service.durationMin * 60_000);

  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id),
    getOcupacoesDoDia(professional.id, dia, tz),
  ]);

  const violations = validateSlot({
    startAt,
    durationMin: appt.service.durationMin,
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: professional.minAdvanceHours,
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
    ignoreAppointmentId: appt.id,
    skipAdvanceCheck: true, // reagendamento interno
  });
  const bloqueantes = violations.filter((v) => v.code !== "ANTECEDENCIA");
  if (bloqueantes.length > 0) {
    return { ok: false, erro: bloqueantes[0].message };
  }

  const horarioLiberado = appt.startAt;
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startAt, endAt },
  });

  const espera = await buscarEsperaParaHorario(
    professional.id,
    horarioLiberado,
    tz,
    appt.service.name,
  );

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, espera };
}
