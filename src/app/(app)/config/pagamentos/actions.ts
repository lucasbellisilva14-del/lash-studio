"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/session";
import { desconectarConta } from "@/lib/mp-oauth";

export async function desconectarMpAction(): Promise<void> {
  const { professionalId } = await requireOwner();
  await desconectarConta(professionalId);
  revalidatePath("/config/pagamentos");
  revalidatePath("/config");
}
