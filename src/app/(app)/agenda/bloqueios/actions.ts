"use server";

/** Server actions dos bloqueios de agenda (avulsos e semanais). */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { localToUtc, timeToMinutes } from "@/lib/dates";

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
});

export type BloqueioFormState = { ok?: boolean; erro?: string };

export async function criarBloqueioAction(
  _prev: BloqueioFormState,
  formData: FormData,
): Promise<BloqueioFormState> {
  const professional = await requireProfessional();
  const parsed = bloqueioSchema.safeParse({
    tipo: formData.get("tipo"),
    titulo: formData.get("titulo"),
    diaInicio: formData.get("diaInicio") ?? "",
    horaInicio: formData.get("horaInicio") ?? "",
    diaFim: formData.get("diaFim") ?? "",
    horaFim: formData.get("horaFim") ?? "",
    diaSemana: formData.get("diaSemana") ?? undefined,
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Preencha os campos do bloqueio." };
  }
  const dados = parsed.data;
  const tz = professional.timezone;

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
  const professional = await requireProfessional();
  const removidos = await prisma.scheduleBlock.deleteMany({
    where: { id, professionalId: professional.id },
  });
  if (removidos.count === 0) return { ok: false, erro: "Bloqueio não encontrado." };
  revalidatePath("/agenda");
  revalidatePath("/agenda/bloqueios");
  return { ok: true };
}
