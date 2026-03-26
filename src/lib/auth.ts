import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isRegister: { label: "Register", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (credentials.isRegister === "true") {
          // Register
          const existing = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (existing) throw new Error("Email already registered");

          // First user becomes admin
          const userCount = await prisma.user.count();
          const role = userCount === 0 ? "admin" : "user";

          const passwordHash = await bcrypt.hash(credentials.password, 12);
          const user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.name || credentials.email.split("@")[0],
              passwordHash,
              role: role as "admin" | "user",
            },
          });

          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }

        // Login
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) throw new Error("Invalid credentials");

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error("Invalid credentials");

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
