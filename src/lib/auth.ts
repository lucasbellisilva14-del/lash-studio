import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        const professional = await prisma.professional.findUnique({ where: { email } });
        if (!professional) return null;

        const valid = await bcrypt.compare(password, professional.passwordHash);
        if (!valid) return null;

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
