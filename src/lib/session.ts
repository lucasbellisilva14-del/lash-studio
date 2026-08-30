import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Toda página e server action protegida usa estes helpers.
 * Multi-tenant: SEMPRE filtrar consultas por professionalId.
 */

export const requireProfessionalId = cache(async (): Promise<string> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
});

export const requireProfessional = cache(async () => {
  const id = await requireProfessionalId();
  const professional = await prisma.professional.findUnique({ where: { id } });
  if (!professional) redirect("/login");
  return professional;
});
