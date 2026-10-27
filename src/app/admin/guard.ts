import "server-only";

/**
 * Guarda do painel admin: só os e-mails da env ADMIN_EMAILS entram — e só a
 * dona da conta (funcionária do estúdio admin não herda o acesso).
 */
import { notFound } from "next/navigation";
import { requireProfessional, requireViewer } from "@/lib/session";

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (!viewer.isOwner) notFound();
  const professional = await requireProfessional();
  const admins = (process.env.ADMIN_EMAILS ?? "lucasbellisilva14@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(professional.email.toLowerCase())) notFound();
  return professional;
}
