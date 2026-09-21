import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Freio de força bruta no login (persistido no banco, por e-mail):
 * 5 erros em 10 min bloqueiam novas tentativas até a janela expirar.
 * Fail-open: se o banco falhar na checagem, o login segue — indisponibilidade
 * não pode trancar a profissional fora do app.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

async function isThrottled(email: string): Promise<boolean> {
  try {
    const entry = await prisma.loginAttempt.findUnique({ where: { email } });
    if (!entry) return false;
    if (entry.resetAt.getTime() < Date.now()) return false;
    return entry.count >= MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

async function registerFailure(email: string): Promise<void> {
  const resetAt = new Date(Date.now() + WINDOW_MS);
  try {
    const entry = await prisma.loginAttempt.findUnique({ where: { email } });
    if (!entry || entry.resetAt.getTime() < Date.now()) {
      await prisma.loginAttempt.upsert({
        where: { email },
        create: { email, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
    } else {
      await prisma.loginAttempt.update({
        where: { email },
        data: { count: { increment: 1 } },
      });
    }
  } catch {
    // registrar a falha é melhor-esforço
  }
}

async function clearFailures(email: string): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { email } });
  } catch {
    // idem
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // expira em 7 dias sem uso
    updateAge: 24 * 60 * 60, // renova a cada dia de uso ativo
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        if (await isThrottled(email)) return null;

        const professional = await prisma.professional.findUnique({ where: { email } });
        if (!professional) {
          await registerFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(password, professional.passwordHash);
        if (!valid) {
          await registerFailure(email);
          return null;
        }

        await clearFailures(email);
        return { id: professional.id, email: professional.email, name: professional.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.professionalId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.professionalId && session.user) {
        session.user.id = token.professionalId as string;
      }
      return session;
    },
  },
});
