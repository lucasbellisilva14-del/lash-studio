import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Freio de força bruta no login (em memória, por e-mail):
 * 5 erros em 10 min bloqueiam novas tentativas até a janela expirar.
 * Em produção com múltiplas instâncias, trocar por armazenamento compartilhado.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isThrottled(email: string): boolean {
  const entry = attempts.get(email);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(email);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(email: string): void {
  const entry = attempts.get(email);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(email, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
        if (isThrottled(email)) return null;

        const professional = await prisma.professional.findUnique({ where: { email } });
        if (!professional) {
          registerFailure(email);
          return null;
        }

        const valid = await bcrypt.compare(password, professional.passwordHash);
        if (!valid) {
          registerFailure(email);
          return null;
        }

        attempts.delete(email);
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
