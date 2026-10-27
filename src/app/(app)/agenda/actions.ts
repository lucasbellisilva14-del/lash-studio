"use server";

/**
 * Server actions da Agenda — todas exigem sessão e filtram por professionalId
 * (o estúdio). Equipe: a funcionária só mexe nos agendamentos dela
 * (canActOnAppointment) e agenda sempre para ela mesma; a dona escolhe a
 * profissional, validada contra getTeam. Conflito, buffer e bloqueios são
 * conferidos na agenda DAQUELA profissional (memberId nulo = a dona).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireOwner, requireProfessional, requireViewer, type Viewer } from "@/lib/session";
import {
  canActOnAppointment,
  clientScope,
  commissionSnapshot,
  getTeam,
} from "@/lib/team";
import { firstName, proByKey, proForMember, type TeamPro } from "@/lib/team-shared";
import { formatBRL } from "@/lib/money";
import {
  diffLocalDays,
  formatDate,
  formatDateLong,
  formatTime,
  localDayKey,
  localToUtc,
} from "@/lib/dates";
import { buildPixPayload } from "@/lib/pix";
import { isValidPhone, normalizePhone, waLink } from "@/lib/phone";
import { freeSlotsForDay, validateSlot, type SlotViolation } from "@/lib/domain/scheduling";
import { checkMaintenanceWindow } from "@/lib/domain/maintenance";
import { computeDeposit } from "@/lib/domain/deposit";
import { criarCobrancaSinal } from "@/lib/domain/deposit-charge";
import { getLastLashAppointment } from "@/lib/domain/cycle";
import {
  CLIENTE_AGENDA_SELECT,
  getGradeAgenda,
  getOcupacoesDoDia,
  toAgendaCliente,
} from "./data";
import type { AgendaCliente, EsperaChamada } from "@/components/agenda/types";

const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");
/** OWNER_KEY ("dona") ou o id da funcionária. Só a dona escolhe; para a funcionária é ignorado. */
const profissionalSchema = z.string().trim().min(1).max(64).optional();
/** WhatsApp da cliente escolhida (ver getClientePermitido). */
const telefoneSchema = z.string().max(25).optional();

/* ------------------------------------------------------------------ */
/* Escopo de quem está logada                                          */
/* ------------------------------------------------------------------ */

type Alvo =
  | { ok: true; memberId: string | null; team: TeamPro[] }
  | { ok: false; erro: string };

/**
 * Para quem é o horário. Funcionária: sempre ela mesma (o formulário não
 * decide). Dona: a profissional escolhida, validada contra a equipe ativa;
 * sem escolha, ela mesma.
 */
async function profissionalDoFormulario(viewer: Viewer, key: string | undefined): Promise<Alvo> {
  const team = await getTeam(viewer.professionalId);
  if (!viewer.isOwner) return { ok: true, memberId: viewer.memberId, team };
  if (!key) return { ok: true, memberId: null, team };
  const pro = proByKey(team, key);
  if (!pro) {
    return { ok: false, erro: "Profissional não encontrada na equipe. Atualize a página e tente de novo." };
  }
  return { ok: true, memberId: pro.memberId, team };
}

/**
 * Com equipe, quando a dona mexe na agenda de outra profissional, o erro de
 * conflito, intervalo ou bloqueio diz de quem é a agenda ("Na agenda de Ana:
 * conflito com..."). Horário de funcionamento é do estúdio: vai sem prefixo.
 */
function naAgendaDe(
  team: TeamPro[],
  memberId: string | null,
  viewer: Viewer,
  violacao: SlotViolation,
): string {
  const { code, message } = violacao;
  const daAgendaDela = code === "CONFLITO" || code === "BUFFER" || code === "BLOQUEIO";
  if (!daAgendaDela || team.length < 2 || memberId === viewer.memberId) return message;
  const pro = proForMember(team, memberId);
  if (!pro) return message;
  return `Na agenda de ${firstName(pro.name)}: ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
}

/**
 * Cliente que quem está logada pode agendar. Funcionária: as do clientScope
 * dela — ou a que ela identificou pelo WhatsApp (o cadastro rápido reaproveita
 * a cliente do estúdio com o mesmo telefone em vez de duplicar).
 */
async function getClientePermitido(viewer: Viewer, clienteId: string, telefone?: string) {
  const escopo: Prisma.ClientWhereInput = viewer.isOwner
    ? {}
    : {
        OR: [
          clientScope(viewer),
          ...(telefone && isValidPhone(telefone) ? [{ phone: normalizePhone(telefone) }] : []),
        ],
      };
  return prisma.client.findFirst({
    where: { id: clienteId, professionalId: viewer.professionalId, AND: [escopo] },
  });
}

/** Agendamento do estúdio em que quem está logada pode mexer (funcionária: só os dela). */
async function getAgendamentoPermitido(viewer: Viewer, id: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, professionalId: viewer.professionalId },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
    },
  });
  if (!appt || !canActOnAppointment(viewer, appt)) return null;
  return appt;
}

/* ------------------------------------------------------------------ */
/* Consultas (chamadas pelo fluxo de criação/reagendamento)            */
/* ------------------------------------------------------------------ */

const horariosLivresSchema = z.object({
  dia: diaSchema,
  servicoId: z.string().min(1),
  /** Reagendamento: ignora o próprio horário e procura na agenda de quem já atende. */
  ignorarId: z.string().optional(),
  profissional: profissionalSchema,
});

export async function horariosLivres(
  input: z.infer<typeof horariosLivresSchema>,
): Promise<{ slots: string[] }> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const parsed = horariosLivresSchema.safeParse(input);
  if (!parsed.success) return { slots: [] };
  const { dia, servicoId, ignorarId, profissional } = parsed.data;

  let memberId: string | null;
  if (ignorarId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: ignorarId, professionalId: professional.id },
      select: { memberId: true },
    });
    if (!appt || !canActOnAppointment(viewer, appt)) return { slots: [] };
    memberId = appt.memberId;
  } else {
    const alvo = await profissionalDoFormulario(viewer, profissional);
    if (!alvo.ok) return { slots: [] };
    memberId = alvo.memberId;
  }

  const service = await prisma.service.findFirst({
    where: { id: servicoId, professionalId: professional.id },
  });
  if (!service) return { slots: [] };

  const tz = professional.timezone;
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id, { memberId }),
    getOcupacoesDoDia(professional.id, dia, tz, memberId),
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

/**
 * Regra de ouro: manutenção fora do prazo (ou sem aplicação) vira aplicação nova.
 * Lê o histórico da cliente, então só vale para clientes do escopo de quem está
 * logada (a reaproveitada pelo WhatsApp recebe o aviso depois de agendar).
 */
export async function verificarManutencao(
  input: z.infer<typeof verificarManutencaoSchema>,
): Promise<AvisoManutencao> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const parsed = verificarManutencaoSchema.safeParse(input);
  if (!parsed.success) return null;
  const { clienteId, servicoId, dia } = parsed.data;

  const [client, service] = await Promise.all([
    getClientePermitido(viewer, clienteId),
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
  | {
      ok: true;
      cliente: AgendaCliente;
      /** O WhatsApp já era de uma cliente do estúdio: o cadastro dela foi reaproveitado. */
      jaExistia: boolean;
      /**
       * Cliente do estúdio fora do escopo da funcionária: só o id vem (com o
       * nome e o WhatsApp que ela digitou); os dados aparecem depois de agendar.
       */
      oculta: boolean;
    }
  | { ok: false; erro: string };

/**
 * Cadastro rápido no agendamento. Mesmo WhatsApp = mesma cliente: se o estúdio
 * já tem alguém com esse telefone, reaproveita o cadastro (não duplica). Cliente
 * nova fica marcada com quem cadastrou (createdByMemberId; nulo = a dona).
 */
export async function criarClienteRapido(input: {
  nome: string;
  whatsapp: string;
}): Promise<ClienteRapidoResult> {
  const viewer = await requireViewer();
  const parsed = clienteRapidoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!isValidPhone(parsed.data.whatsapp)) {
    return { ok: false, erro: "WhatsApp inválido — use DDD + número (ex.: 48 99999-8888)." };
  }
  const phone = normalizePhone(parsed.data.whatsapp);

  // Primeiro uma que quem está logada já pode ver (a dona vê todas).
  const visivel = await prisma.client.findFirst({
    where: { professionalId: viewer.professionalId, phone, AND: [clientScope(viewer)] },
    orderBy: { createdAt: "asc" },
    select: CLIENTE_AGENDA_SELECT,
  });
  if (visivel) {
    return { ok: true, cliente: toAgendaCliente(visivel), jaExistia: true, oculta: false };
  }
  if (!viewer.isOwner) {
    // Cliente do estúdio fora do escopo da funcionária: reaproveita o cadastro
    // sem mostrar nada dela antes de agendar. O horário passa pela prova do
    // WhatsApp (getClientePermitido) e, agendado, ela entra no escopo.
    const doEstudio = await prisma.client.findFirst({
      where: { professionalId: viewer.professionalId, phone },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (doEstudio) {
      return {
        ok: true,
        cliente: {
          id: doEstudio.id,
          nome: parsed.data.nome,
          telefone: phone,
          faltas: 0,
          temContraindicacao: false,
          flags: [],
        },
        jaExistia: true,
        oculta: true,
      };
    }
  }

  const created = await prisma.client.create({
    data: {
      professionalId: viewer.professionalId,
      name: parsed.data.nome,
      phone,
      createdByMemberId: viewer.memberId,
    },
    select: CLIENTE_AGENDA_SELECT,
  });
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  return { ok: true, cliente: toAgendaCliente(created), jaExistia: false, oculta: false };
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
  /** Opcional: já deixa a manutenção do ciclo agendada junto com a aplicação. */
  manutencao: z.object({ dia: diaSchema, hora: horaSchema }).optional(),
  profissional: profissionalSchema,
  clienteTelefone: telefoneSchema,
});

type ProfessionalRow = NonNullable<
  Awaited<ReturnType<typeof prisma.professional.findFirst>>
>;

/**
 * Cria a manutenção vinculada a uma aplicação (usada no fluxo de criação e no
 * detalhe do agendamento), com a MESMA profissional da aplicação. Valida a
 * janela do ciclo, conflitos na agenda dela e sinal.
 */
async function criarManutencaoVinculada(params: {
  professional: ProfessionalRow;
  viewer: Viewer;
  team: TeamPro[];
  memberId: string | null;
  clientId: string;
  clientNoShowCount: number;
  aplicacaoServiceId: string;
  aplicacaoStartAt: Date;
  dia: string;
  hora: string;
}): Promise<{ ok: boolean; aviso: string }> {
  const {
    professional,
    viewer,
    team,
    memberId,
    clientId,
    clientNoShowCount,
    aplicacaoServiceId,
    aplicacaoStartAt,
    dia,
    hora,
  } = params;
  const tz = professional.timezone;

  const manutServico = await prisma.service.findFirst({
    where: {
      professionalId: professional.id,
      maintenanceOfId: aplicacaoServiceId,
      active: true,
    },
  });
  if (!manutServico) {
    return { ok: false, aviso: "Manutenção não agendada: nenhum serviço de manutenção vinculado a essa aplicação." };
  }

  const startAt = localToUtc(dia, hora, tz);
  const diasDepois = diffLocalDays(aplicacaoStartAt, startAt, tz);
  if (diasDepois < 1) {
    return { ok: false, aviso: "Manutenção não agendada: precisa ser depois da aplicação." };
  }
  if (diasDepois > professional.maintenanceLimitDays) {
    return {
      ok: false,
      aviso: `Manutenção não agendada: ficaria ${diasDepois} dias após a aplicação — acima do prazo de ${professional.maintenanceLimitDays} dias do ciclo.`,
    };
  }

  const endAt = new Date(startAt.getTime() + manutServico.durationMin * 60_000);
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id, { memberId }),
    getOcupacoesDoDia(professional.id, dia, tz, memberId),
  ]);
  const bloqueantes = validateSlot({
    startAt,
    durationMin: manutServico.durationMin,
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: 0,
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
    skipAdvanceCheck: true,
  }).filter((v) => v.code !== "ANTECEDENCIA");
  if (bloqueantes.length > 0) {
    return {
      ok: false,
      aviso: `Manutenção não agendada: ${naAgendaDe(team, memberId, viewer, bloqueantes[0])}`,
    };
  }

  const sinal = computeDeposit({
    policy: {
      depositType: professional.depositType,
      depositValue: professional.depositValue,
      noShowThreshold: professional.noShowThreshold,
    },
    serviceRequiresDeposit: manutServico.requiresDeposit,
    clientNoShowCount,
    priceCents: manutServico.priceCents,
  });

  const manutCriada = await prisma.appointment.create({
    data: {
      professionalId: professional.id,
      clientId,
      serviceId: manutServico.id,
      startAt,
      endAt,
      status: sinal.required ? "PRE_AGENDADO" : "CONFIRMADO",
      priceCents: manutServico.priceCents,
      depositRequired: sinal.required,
      depositCents: sinal.required ? sinal.depositCents : null,
      source: "INTERNO",
      memberId,
      commissionPct: commissionSnapshot(team, memberId),
    },
  });
  if (sinal.required) await criarCobrancaSinal(manutCriada.id);

  const quando = `${formatDate(startAt, tz)} às ${hora}`;
  const extraSinal = sinal.required
    ? ` (sinal de ${formatBRL(sinal.depositCents)} — entra como pré-agendada)`
    : "";
  return {
    ok: true,
    aviso: `Manutenção já garantida para ${quando}, dia ${diasDepois} do ciclo${extraSinal}.`,
  };
}

export type CriarAgendamentoResult =
  | { ok: true; id: string; status: string; aviso: string | null }
  | { ok: false; erro: string };

export async function criarAgendamento(
  input: z.infer<typeof criarAgendamentoSchema>,
): Promise<CriarAgendamentoResult> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const parsed = criarAgendamentoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { clienteId, servicoId, dia, hora, observacoes, manutencao, profissional, clienteTelefone } =
    parsed.data;
  const tz = professional.timezone;

  const alvo = await profissionalDoFormulario(viewer, profissional);
  if (!alvo.ok) return { ok: false, erro: alvo.erro };
  const { memberId, team } = alvo;

  const [client, service] = await Promise.all([
    getClientePermitido(viewer, clienteId, clienteTelefone),
    prisma.service.findFirst({
      where: { id: servicoId, professionalId: professional.id, active: true },
    }),
  ]);
  if (!client) return { ok: false, erro: "Cliente não encontrada." };
  if (!service) return { ok: false, erro: "Serviço não encontrado ou inativo." };

  const startAt = localToUtc(dia, hora, tz);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  // Cliente do estúdio reconhecida só pelo telefone (fora do escopo dela): a
  // funcionária só agenda dali para frente — horário no passado não abre a ficha.
  if (!viewer.isOwner && startAt < new Date()) {
    const noEscopo = await prisma.client.count({
      where: { id: client.id, professionalId: professional.id, ...clientScope(viewer) },
    });
    if (!noEscopo) {
      return { ok: false, erro: "Para essa cliente, escolha um horário de agora em diante." };
    }
  }

  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id, { memberId }),
    getOcupacoesDoDia(professional.id, dia, tz, memberId),
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
    return { ok: false, erro: naAgendaDe(team, memberId, viewer, bloqueantes[0]) };
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
      memberId,
      commissionPct: commissionSnapshot(team, memberId),
    },
  });

  if (sinal.required) {
    // Mercado Pago integrado: Pix com confirmação automática do sinal.
    await criarCobrancaSinal(created.id);
    const motivo =
      sinal.reason === "NO_SHOW"
        ? `cliente com ${client.noShowCount} falta${client.noShowCount === 1 ? "" : "s"}`
        : "o serviço exige sinal";
    avisos.push(
      `Sinal de ${formatBRL(sinal.depositCents)} exigido (${motivo}). O horário fica pré-agendado até o sinal ser recebido.`,
    );
  }

  // Opcional: já deixa a manutenção do ciclo agendada junto (mesma profissional).
  if (manutencao) {
    const r = await criarManutencaoVinculada({
      professional,
      viewer,
      team,
      memberId,
      clientId: client.id,
      clientNoShowCount: client.noShowCount,
      aplicacaoServiceId: service.id,
      aplicacaoStartAt: startAt,
      dia: manutencao.dia,
      hora: manutencao.hora,
    });
    avisos.push(r.aviso);
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, id: created.id, status, aviso: avisos.length ? avisos.join(" ") : null };
}

/* ------------------------------------------------------------------ */
/* Programar manutenção a partir de uma aplicação já agendada          */
/* ------------------------------------------------------------------ */

const agendarManutencaoSchema = z.object({
  aplicacaoId: z.string().min(1),
  dia: diaSchema,
  hora: horaSchema,
});

export type ManutencaoResult = { ok: true; aviso: string } | { ok: false; erro: string };

export async function agendarManutencaoDe(
  input: z.infer<typeof agendarManutencaoSchema>,
): Promise<ManutencaoResult> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const parsed = agendarManutencaoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { aplicacaoId, dia, hora } = parsed.data;

  const appt = await prisma.appointment.findFirst({
    where: { id: aplicacaoId, professionalId: professional.id },
    include: {
      client: { select: { id: true, name: true, noShowCount: true } },
      service: { select: { id: true, category: true } },
    },
  });
  if (!appt || !canActOnAppointment(viewer, appt)) {
    return { ok: false, erro: "Agendamento não encontrado." };
  }
  if (appt.service.category !== "APLICACAO") {
    return { ok: false, erro: "Só dá para programar manutenção a partir de uma aplicação." };
  }

  // A manutenção fica com quem fez a aplicação — se ela ainda está na equipe.
  const team = await getTeam(professional.id);
  if (appt.memberId && !proForMember(team, appt.memberId)) {
    return {
      ok: false,
      erro: "Quem fez essa aplicação não está mais na equipe. Agende a manutenção pela agenda, escolhendo a profissional.",
    };
  }

  // Evita duplicar: cliente já tem manutenção futura marcada?
  const jaTem = await prisma.appointment.findFirst({
    where: {
      professionalId: professional.id,
      clientId: appt.client.id,
      status: { in: ["PRE_AGENDADO", "CONFIRMADO"] },
      startAt: { gt: new Date() },
      service: { category: "MANUTENCAO" },
    },
  });
  if (jaTem) {
    return {
      ok: false,
      erro: `${firstName(appt.client.name)} já tem manutenção marcada para ${formatDate(jaTem.startAt, professional.timezone)}.`,
    };
  }

  const r = await criarManutencaoVinculada({
    professional,
    viewer,
    team,
    memberId: appt.memberId,
    clientId: appt.client.id,
    clientNoShowCount: appt.client.noShowCount,
    aplicacaoServiceId: appt.service.id,
    aplicacaoStartAt: appt.startAt,
    dia,
    hora,
  });
  if (!r.ok) return { ok: false, erro: r.aviso };

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, aviso: r.aviso };
}

/* ------------------------------------------------------------------ */
/* Ações sobre um agendamento existente                                */
/* ------------------------------------------------------------------ */

export type AcaoResult = { ok: true } | { ok: false; erro: string };

export async function sinalRecebido(id: string): Promise<AcaoResult> {
  const viewer = await requireViewer();
  const appt = await getAgendamentoPermitido(viewer, id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (appt.status !== "PRE_AGENDADO") {
    return { ok: false, erro: "Só agendamentos pré-agendados aguardam sinal." };
  }

  const agora = new Date();
  const escritas: Prisma.PrismaPromise<unknown>[] = [
    prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CONFIRMADO", depositPaidAt: agora },
    }),
  ];

  // Sinal vira lançamento financeiro próprio (a ficha depois cobra só o restante).
  if (appt.depositCents && appt.depositCents > 0) {
    const jaLancado = await prisma.transaction.findFirst({
      where: { professionalId: viewer.professionalId, appointmentId: appt.id, kind: "SINAL" },
    });
    if (!jaLancado) {
      escritas.push(
        prisma.transaction.create({
          data: {
            professionalId: viewer.professionalId,
            type: "RECEITA",
            kind: "SINAL",
            appointmentId: appt.id,
            clientId: appt.client.id,
            description: `Sinal — ${appt.service.name} (${appt.client.name})`,
            amountCents: appt.depositCents,
            method: "PIX",
            feePct: 0,
            feeCents: 0,
            netCents: appt.depositCents,
            date: agora,
          },
        }),
      );
    }
  }

  await prisma.$transaction(escritas);
  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { ok: true };
}

/**
 * Desfaz uma marcação errada: FALTOU / CANCELADO / CANCELADO_TARDE voltam
 * para o status anterior (revalidando conflito na agenda de quem atende) e os
 * contadores da cliente são corrigidos.
 */
export async function reverterStatus(id: string): Promise<AcaoResult> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const appt = await getAgendamentoPermitido(viewer, id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };

  const reversiveis = ["FALTOU", "CANCELADO", "CANCELADO_TARDE"];
  if (!reversiveis.includes(appt.status)) {
    return { ok: false, erro: "Esse status não pode ser revertido." };
  }

  // Horário futuro: garante que ninguém ocupou o lugar nesse meio-tempo.
  if (appt.startAt > new Date()) {
    const tz = professional.timezone;
    const dia = localDayKey(appt.startAt, tz);
    const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
      getGradeAgenda(professional.id, { memberId: appt.memberId }),
      getOcupacoesDoDia(professional.id, dia, tz, appt.memberId),
    ]);
    const conflitos = validateSlot({
      startAt: appt.startAt,
      durationMin: Math.round((appt.endAt.getTime() - appt.startAt.getTime()) / 60_000),
      bufferMinutes: professional.bufferMinutes,
      minAdvanceHours: 0,
      timezone: tz,
      workingHours,
      blocks,
      appointments: ocupacoes,
      ignoreAppointmentId: appt.id,
      skipAdvanceCheck: true,
    }).filter((v) => v.code === "CONFLITO" || v.code === "BUFFER");
    if (conflitos.length > 0) {
      return { ok: false, erro: `Não dá para reverter: ${conflitos[0].message}` };
    }
  }

  const statusRestaurado =
    appt.depositRequired && !appt.depositPaidAt ? "PRE_AGENDADO" : "CONFIRMADO";
  const escritas: Prisma.PrismaPromise<unknown>[] = [
    prisma.appointment.update({ where: { id: appt.id }, data: { status: statusRestaurado } }),
  ];
  if (appt.status === "FALTOU") {
    escritas.push(
      prisma.client.update({
        where: { id: appt.clientId },
        data: { noShowCount: { decrement: 1 } },
      }),
    );
  }
  if (appt.status === "CANCELADO_TARDE") {
    escritas.push(
      prisma.client.update({
        where: { id: appt.clientId },
        data: { lateCancelCount: { decrement: 1 } },
      }),
    );
  }
  await prisma.$transaction(escritas);
  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true };
}

export async function concluirAgendamento(id: string): Promise<AcaoResult> {
  const viewer = await requireViewer();
  const appt = await getAgendamentoPermitido(viewer, id);
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
  const viewer = await requireViewer();
  const appt = await getAgendamentoPermitido(viewer, id);
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
    const primeiroNome = firstName(e.client.name);
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
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const appt = await getAgendamentoPermitido(viewer, id);
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

  // A lista de espera é só da dona.
  const espera = viewer.isOwner
    ? await buscarEsperaParaHorario(
        professional.id,
        appt.startAt,
        professional.timezone,
        appt.service.name,
      )
    : [];

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, status: tardio ? "CANCELADO_TARDE" : "CANCELADO", espera };
}

export type PixCodigoResult =
  | { ok: true; codigo: string; valorCents: number }
  | { ok: false; erro: string };

/** Pix copia-e-cola do sinal (MP com confirmação automática, senão BR Code). */
export async function pixDoSinal(id: string): Promise<PixCodigoResult> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const appt = await getAgendamentoPermitido(viewer, id);
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (!appt.depositCents || appt.depositCents <= 0) {
    return { ok: false, erro: "Esse agendamento não tem sinal definido." };
  }
  // Cobrança do Mercado Pago (paga = confirma sozinho) tem prioridade.
  if (appt.pixCopiaCola) {
    return { ok: true, codigo: appt.pixCopiaCola, valorCents: appt.depositCents };
  }
  if (!professional.pixKey) {
    return {
      ok: false,
      erro: viewer.isOwner
        ? "Cadastre sua chave Pix em Configurações → Perfil."
        : "O estúdio ainda não cadastrou a chave Pix. Fale com a responsável pelo estúdio.",
    };
  }
  const codigo = buildPixPayload({
    pixKey: professional.pixKey,
    merchantName: professional.studioName,
    amountCents: appt.depositCents,
  });
  return { ok: true, codigo, valorCents: appt.depositCents };
}

const reagendarSchema = z.object({
  id: z.string().min(1),
  dia: diaSchema,
  hora: horaSchema,
});

export type ReagendarResult =
  | { ok: true; espera: EsperaChamada[] }
  | { ok: false; erro: string };

/** Novo horário na agenda de quem já atende (a profissional não muda aqui). */
export async function reagendarAgendamento(
  input: z.infer<typeof reagendarSchema>,
): Promise<ReagendarResult> {
  const viewer = await requireViewer();
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
  if (!appt || !canActOnAppointment(viewer, appt)) {
    return { ok: false, erro: "Agendamento não encontrado." };
  }
  if (appt.status !== "PRE_AGENDADO" && appt.status !== "CONFIRMADO") {
    return { ok: false, erro: "Esse agendamento não pode ser reagendado." };
  }

  const startAt = localToUtc(dia, hora, tz);
  const endAt = new Date(startAt.getTime() + appt.service.durationMin * 60_000);

  const [{ workingHours, blocks }, ocupacoes, team] = await Promise.all([
    getGradeAgenda(professional.id, { memberId: appt.memberId }),
    getOcupacoesDoDia(professional.id, dia, tz, appt.memberId),
    getTeam(professional.id),
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
    return { ok: false, erro: naAgendaDe(team, appt.memberId, viewer, bloqueantes[0]) };
  }

  const horarioLiberado = appt.startAt;
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startAt, endAt },
  });

  // A lista de espera é só da dona.
  const espera = viewer.isOwner
    ? await buscarEsperaParaHorario(professional.id, horarioLiberado, tz, appt.service.name)
    : [];

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true, espera };
}

/* ------------------------------------------------------------------ */
/* Trocar a profissional de um agendamento (só a dona)                 */
/* ------------------------------------------------------------------ */

const trocarProfissionalSchema = z.object({
  id: z.string().min(1),
  profissional: z.string().trim().min(1).max(64),
});

/**
 * Passa o atendimento para outra profissional: confere o MESMO horário na
 * agenda dela (conflito, intervalo e bloqueios) e congela a comissão atual
 * dela no agendamento.
 */
export async function trocarProfissional(
  input: z.infer<typeof trocarProfissionalSchema>,
): Promise<AcaoResult> {
  const viewer = await requireOwner();
  const professional = await requireProfessional();
  const parsed = trocarProfissionalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Escolha a profissional." };
  const { id, profissional } = parsed.data;

  const team = await getTeam(professional.id);
  const pro = proByKey(team, profissional);
  if (!pro) {
    return { ok: false, erro: "Profissional não encontrada na equipe. Atualize a página e tente de novo." };
  }

  const appt = await prisma.appointment.findFirst({
    where: { id, professionalId: professional.id },
    select: { id: true, status: true, startAt: true, endAt: true, memberId: true },
  });
  if (!appt) return { ok: false, erro: "Agendamento não encontrado." };
  if (!["PRE_AGENDADO", "CONFIRMADO", "CONCLUIDO"].includes(appt.status)) {
    return { ok: false, erro: "Só dá para trocar a profissional de horários marcados ou concluídos." };
  }
  if (appt.memberId === pro.memberId) return { ok: true };

  const tz = professional.timezone;
  const dia = localDayKey(appt.startAt, tz);
  const [{ workingHours, blocks }, ocupacoes] = await Promise.all([
    getGradeAgenda(professional.id, { memberId: pro.memberId }),
    getOcupacoesDoDia(professional.id, dia, tz, pro.memberId),
  ]);
  const impedimentos = validateSlot({
    startAt: appt.startAt,
    durationMin: Math.round((appt.endAt.getTime() - appt.startAt.getTime()) / 60_000),
    bufferMinutes: professional.bufferMinutes,
    minAdvanceHours: 0,
    timezone: tz,
    workingHours,
    blocks,
    appointments: ocupacoes,
    ignoreAppointmentId: appt.id,
    skipAdvanceCheck: true,
  }).filter((v) => v.code === "CONFLITO" || v.code === "BUFFER" || v.code === "BLOQUEIO");
  if (impedimentos.length > 0) {
    return { ok: false, erro: naAgendaDe(team, pro.memberId, viewer, impedimentos[0]) };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { memberId: pro.memberId, commissionPct: commissionSnapshot(team, pro.memberId) },
  });
  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { ok: true };
}
