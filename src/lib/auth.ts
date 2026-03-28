import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ALL_SERVICE_TYPES } from "@/lib/service-types";
import { encrypt } from "@/lib/crypto";
import { provisionDatabase } from "@/lib/builtin-pg";
import type { ServiceType } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function createOrganizationWithDefaults(name: string) {
  const slug = slugify(name) || "org";
  const org = await prisma.organization.create({
    data: {
      name,
      slug: `${slug}-${Date.now()}`,
    },
  });

  // Seed all service types as allowed
  await prisma.orgAllowedService.createMany({
    data: ALL_SERVICE_TYPES.map((serviceType) => ({
      organizationId: org.id,
      serviceType,
      enabled: true,
    })),
  });

  // Auto-provision built-in services
  const orgSlug = org.slug;

  // Provision a real database & user on the shared PostgreSQL instance
  const pgCreds = await provisionDatabase(orgSlug);

  const pgConfig = encrypt(JSON.stringify({
    host: process.env.PLATFORM_PG_HOST || "localhost",
    port: process.env.PLATFORM_PG_PORT || "5432",
    database: pgCreds.database,
    username: pgCreds.username,
    password: pgCreds.password,
  }));
  await prisma.service.create({
    data: {
      name: "Built-in PostgreSQL",
      type: "built_in_pg" as ServiceType,
      configEncrypted: pgConfig.ciphertext,
      iv: pgConfig.iv,
      authTag: pgConfig.authTag,
      organizationId: org.id,
    },
  });

  const diskConfig = encrypt(JSON.stringify({
    basePath: `/data/storage/${orgSlug}`,
  }));
  await prisma.service.create({
    data: {
      name: "Built-in Disk Storage",
      type: "built_in_disk" as ServiceType,
      configEncrypted: diskConfig.ciphertext,
      iv: diskConfig.iv,
      authTag: diskConfig.authTag,
      organizationId: org.id,
    },
  });

  const realEstateConfig = encrypt(JSON.stringify({
    apiBaseUrl: `/api/platform/real-estate/${orgSlug}`,
  }));
  await prisma.service.create({
    data: {
      name: "Built-in Real Estate",
      type: "built_in_real_estate" as ServiceType,
      configEncrypted: realEstateConfig.ciphertext,
      iv: realEstateConfig.iv,
      authTag: realEstateConfig.authTag,
      organizationId: org.id,
    },
  });

  return org;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isRegister: { label: "Register", type: "text" },
        organizationName: { label: "Organization", type: "text" },
        organizationId: { label: "Organization ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limit: 10 login attempts per email per 15 minutes
        const rl = rateLimit(`login:${credentials.email}`, 10, 15 * 60 * 1000);
        if (rl.limited) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        if (credentials.isRegister === "true") {
          // Register
          const existing = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (existing) throw new Error("Email already registered");

          // First user becomes admin and creates org
          const userCount = await prisma.user.count();
          const isFirstUser = userCount === 0;
          const role = isFirstUser ? "admin" : "user";

          let organizationId: string;

          if (isFirstUser) {
            const orgName = credentials.organizationName || "My Organization";
            const org = await createOrganizationWithDefaults(orgName);
            organizationId = org.id;
          } else if (credentials.organizationId) {
            // Join existing org
            const org = await prisma.organization.findUnique({
              where: { id: credentials.organizationId },
            });
            if (!org) throw new Error("Organization not found");
            organizationId = org.id;
          } else {
            // Create new org for the user
            const orgName = credentials.organizationName || `${credentials.name || credentials.email.split("@")[0]}'s Organization`;
            const org = await createOrganizationWithDefaults(orgName);
            organizationId = org.id;
          }

          const passwordHash = await bcrypt.hash(credentials.password, 12);
          const user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.name || credentials.email.split("@")[0],
              passwordHash,
              role: role as "admin" | "user",
              organizationId,
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
          };
        }

        // Login
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) throw new Error("Invalid credentials");

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error("Invalid credentials");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.organizationId = (user as { organizationId: string }).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { organizationId: string }).organizationId =
          token.organizationId as string;
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

export { ALL_SERVICE_TYPES, createOrganizationWithDefaults };
