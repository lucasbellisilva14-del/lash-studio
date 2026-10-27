"use server";

/**
 * Server actions dos bloqueios de agenda (avulsos e semanais). A quem vale:
 * a dona escolhe o estúdio inteiro (allTeam), ela mesma ou uma funcionária
 * (validada contra getTeam); a funcionária só bloqueia a própria agenda.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional, requireViewer } from "@/lib/session";
import { getTeam } from "@/lib/team";
import { OWNER_KEY, proByKey } from "@/lib/team-shared";
import { localToUtc, timeToMinutes } from "@/lib/dates";
import { ESTUDIO_KEY } from "@/components/agenda/pro";

const diaRegex = /^\d{4}-\d{2}-\d{2}$/;
const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const bloqueioSchema = z.object({
  tipo: z.enum(["AVULSO", "SEMANAL"]),
  titulo: z.string().trim().min(1, "Dê um título ao bloqueio."),
  diaInicio: z.string().regex(diaRegex).optional().or(z.literal("")),
  horaInicio: z.string().regex(horaRegex).optional().or(z.literal("")),
  diaFim: z.string().regex(diaRegex).optional().or(z.literal("")),
  horaFim: z.string().regex(horaRegex).optional().or(z.literal("")),
  diaSemana: z.coerce.number().int().min(0).max(6).optional(),
  /** ESTUDIO_KEY, OWNER_KEY ou o id da funcionária (só a dona com equipe envia). */
  para: z.string().trim().max(64).optional().or(z.literal("")),
});

export type BloqueioFormState = { ok?: boolean; erro?: string };

export async function criarBloqueioAction(
  _prev: BloqueioFormState,
  formData: FormData,
): Promise<BloqueioFormState> {
  const viewer = await requireViewer();
  const professional = await requireProfessional();
  const parsed = bloqueioSchema.safeParse({
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    diaInicio: formData.get("diaInicio") ?? "",
    horaInicio: formData.get("horaInicio") ?? "",
    diaFim: formData.get("diaFim") ?? "",
    horaFim: formData.get("horaFim") ?? "",
    diaSemana: formData.get("diaSemana") ?? undefined,
    para: formData.get("para") ?? "",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Preencha os campos do bloqueio." };
  }
  const dados = parsed.data;
  const tz = professional.timezone;

  // A quem vale. Funcionária: só a própria agenda (o formulário não decide).
  let memberId: string | null = viewer.memberId;
  let allTeam = false;
  if (viewer.isOwner) {
    memberId = null;
    const para = dados.para || OWNER_KEY;
    if (para !== OWNER_KEY) {
      const team = await getTeam(professional.id);
      if (para === ESTUDIO_KEY) {
        // Sem equipe, o estúdio é ela: o bloqueio fica como sempre foi.
        allTeam = team.length > 1;
      } else {
        const pro = proByKey(team, para);
        if (!pro) return { erro: "Escolha para quem vale o bloqueio." };
        memberId = pro.memberId;
      }
    }
  }

  if (dados.tipo === "AVULSO") {
    if (!dados.diaInicio || !dados.horaInicio || !dados.diaFim || !dados.horaFim) {
      return { erro: "Informe data e hora de início e fim." };
    }
    const startAt = localToUtc(dados.diaInicio, dados.horaInicio, tz);
    const endAt = localToUtc(dados.diaFim, dados.horaFim, tz);
    if (endAt <= startAt) {
      return { erro: "O fim do bloqueio precisa ser depois do início." };
    }
    await prisma.scheduleBlock.create({
      data: {
        professionalId: professional.id,
        title: dados.titulo,
        type: "AVULSO",
        startAt,
        endAt,
        memberId,
        allTeam,
      },
    });
  } else {
    if (dados.diaSemana === undefined || !dados.horaInicio || !dados.horaFim) {
      return { erro: "Informe o dia da semana e o horário do bloqueio." };
    }
    if (timeToMinutes(dados.horaFim) <= timeToMinutes(dados.horaInicio)) {
      return { erro: "A hora final precisa ser depois da inicial." };
    }
    await prisma.scheduleBlock.create({
      data: {
        professionalId: professional.id,
        title: dados.titulo,
        type: "SEMANAL",
        weekday: dados.diaSemana,
        startTime: dados.horaInicio,
        endTime: dados.horaFim,
        memberId,
        allTeam,
      },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/agenda/bloqueios");
  return { ok: true };
}

export async function excluirBloqueio(
  id: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const viewer = await requireViewer();
  const removidos = await prisma.scheduleBlock.deleteMany({
    where: {
      id,
      professionalId: viewer.professionalId,
      // A funcionária só apaga os bloqueios da própria agenda.
      ...(viewer.isOwner ? {} : { memberId: viewer.memberId, allTeam: false }),
    },
  });
  if (removidos.count === 0) return { ok: false, erro: "Bloqueio não encontrado." };
  revalidatePath("/agenda");
  revalidatePath("/agenda/bloqueios");
  return { ok: true };
}
