"use server";

import { revalidatePath } from "next/cache";
import { requireProfessionalId } from "@/lib/session";
import { desconectarConta } from "@/lib/mp-oauth";

export async function desconectarMpAction(): Promise<void> {
  const professionalId = await requireProfessionalId();
  await desconectarConta(professionalId);
  revalidatePath("/config/pagamentos");
  revalidatePath("/config");
}
