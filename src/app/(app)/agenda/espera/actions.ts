"use server";

/** Server actions da lista de espera. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProfessional } from "@/lib/session";
import { dayKeyToUtcStart, localToUtc } from "@/lib/dates";

const diaRegex = /^\d{4}-\d{2}-\d{2}$/;

const esperaSchema = z.object({
  clienteId: z.string().min(1, "Escolha a cliente."),
  servicoId: z.string().optional().or(z.literal("")),
  dataDe: z.string().regex(diaRegex).optional().or(z.literal("")),
  dataAte: z.string().regex(diaRegex).optional().or(z.literal("")),
  nota: z.string().trim().max(200).optional().or(z.literal("")),
});

export type EsperaFormState = { ok?: boolean; erro?: string };

export async function criarEsperaAction(
  _prev: EsperaFormState,
  formData: FormData,
): Promise<EsperaFormState> {
  const professional = await requireProfessional();
  const parsed = esperaSchema.safeParse({
    clienteId: formData.get("clienteId"),
    servicoId: formData.get("servicoId") ?? "",
    dataDe: formData.get("dataDe") ?? "",
    dataAte: formData.get("dataAte") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parsed.data;
  const tz = professional.timezone;

  const client = await prisma.client.findFirst({
    where: { id: dados.clienteId, professionalId: professional.id },
  });
  if (!client) return { erro: "Cliente não encontrada." };

  let serviceId: string | null = null;
  if (dados.servicoId) {
    const service = await prisma.service.findFirst({
      where: { id: dados.servicoId, professionalId: professional.id },
    });
    if (!service) return { erro: "Serviço não encontrado." };
    serviceId = service.id;
  }

  if (dados.dataDe && dados.dataAte && dados.dataAte < dados.dataDe) {
    return { erro: "O fim do período precisa ser depois do início." };
  }

  await prisma.waitlistEntry.create({
    data: {
      professionalId: professional.id,
      clientId: client.id,
      serviceId,
      dateFrom: dados.dataDe ? dayKeyToUtcStart(dados.dataDe, tz) : null,
      dateTo: dados.dataAte ? localToUtc(dados.dataAte, "23:59", tz) : null,
      periodNote: dados.nota || null,
      status: "ATIVA",
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/agenda/espera");
  return { ok: true };
}

const statusSchema = z.enum(["ATENDIDA", "CANCELADA"]);

export async function mudarStatusEspera(
  id: string,
  status: "ATENDIDA" | "CANCELADA",
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const professional = await requireProfessional();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, erro: "Status inválido." };

  const atualizados = await prisma.waitlistEntry.updateMany({
    where: { id, professionalId: professional.id, status: "ATIVA" },
    data: { status: parsed.data },
  });
  if (atualizados.count === 0) {
    return { ok: false, erro: "Entrada não encontrada ou já resolvida." };
  }
  revalidatePath("/agenda");
  revalidatePath("/agenda/espera");
  return { ok: true };
}
