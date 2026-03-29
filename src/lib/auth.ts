import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ALL_SERVICE_TYPES, INDUSTRY_SERVICE_TYPES } from "@/lib/service-types";
import { encrypt } from "@/lib/crypto";
import { provisionSupabaseProject } from "@/lib/builtin-supabase";
import { provisionKeycloakRealm } from "@/lib/builtin-keycloak";
import { provisionMinioBucket } from "@/lib/builtin-minio";
import { provisionN8nWorkspace } from "@/lib/builtin-n8n";
import { provisionQdrantCollection } from "@/lib/builtin-qdrant";
import { provisionMeilisearchIndex } from "@/lib/builtin-meilisearch";
import { provisionPostHogProject } from "@/lib/builtin-posthog";
import { provisionMetabaseGroup } from "@/lib/builtin-metabase";
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

  // Auto-provision built-in services
  const orgSlug = org.slug;

  // Provision built-in Supabase
  const supabaseCreds = await provisionSupabaseProject(orgSlug);
  const supabaseConfig = encrypt(JSON.stringify({
    projectUrl: supabaseCreds.projectUrl,
    apiKey: supabaseCreds.apiKey,
    serviceRoleKey: supabaseCreds.serviceRoleKey,
  }));
  await prisma.service.create({
    data: {
      name: "Built-in Supabase",
      type: "built_in_supabase" as ServiceType,
      endpointUrl: supabaseCreds.projectUrl,
      configEncrypted: supabaseConfig.ciphertext,
      iv: supabaseConfig.iv,
      authTag: supabaseConfig.authTag,
      organizationId: org.id,
    },
  });

  // Auto-provision built-in infrastructure services (graceful degradation)
  const infraProvisions: { name: string; type: ServiceType; provision: () => Promise<Record<string, unknown>>; endpointUrlKey?: string }[] = [
    { name: "Built-in Keycloak", type: "built_in_keycloak" as ServiceType, provision: async () => { const c = await provisionKeycloakRealm(orgSlug); return { url: c.url, realm: c.realm, clientId: c.clientId, clientSecret: c.clientSecret }; }, endpointUrlKey: "url" },
    { name: "Built-in MinIO", type: "built_in_minio" as ServiceType, provision: async () => { const c = await provisionMinioBucket(orgSlug); return { endpoint: c.endpoint, accessKey: c.accessKey, secretKey: c.secretKey, bucket: c.bucket }; }, endpointUrlKey: "endpoint" },
    { name: "Built-in n8n", type: "built_in_n8n" as ServiceType, provision: async () => { const c = await provisionN8nWorkspace(orgSlug); return { url: c.url, apiKey: c.apiKey, webhookUrl: c.webhookUrl }; }, endpointUrlKey: "url" },
    { name: "Built-in Qdrant", type: "built_in_qdrant" as ServiceType, provision: async () => { const c = await provisionQdrantCollection(orgSlug); return { url: c.url, apiKey: c.apiKey, collectionPrefix: c.collectionPrefix }; }, endpointUrlKey: "url" },
    { name: "Built-in Meilisearch", type: "built_in_meilisearch" as ServiceType, provision: async () => { const c = await provisionMeilisearchIndex(orgSlug); return { url: c.url, apiKey: c.apiKey, indexPrefix: c.indexPrefix }; }, endpointUrlKey: "url" },
    { name: "Built-in PostHog", type: "built_in_posthog" as ServiceType, provision: async () => { const c = await provisionPostHogProject(orgSlug); return { url: c.url, apiKey: c.apiKey, projectId: c.projectId }; }, endpointUrlKey: "url" },
    { name: "Built-in Metabase", type: "built_in_metabase" as ServiceType, provision: async () => { const c = await provisionMetabaseGroup(orgSlug); return { url: c.url, apiKey: c.apiKey, groupName: c.groupName }; }, endpointUrlKey: "url" },
  ];

  for (const svc of infraProvisions) {
    try {
      const creds = await svc.provision();
      const cfg = encrypt(JSON.stringify(creds));
      await prisma.service.create({
        data: {
          name: svc.name,
          type: svc.type,
          endpointUrl: svc.endpointUrlKey ? (creds[svc.endpointUrlKey] as string) : undefined,
          configEncrypted: cfg.ciphertext,
          iv: cfg.iv,
          authTag: cfg.authTag,
          organizationId: org.id,
        },
      });
    } catch {
      // Graceful degradation: service not available yet
    }
  }

  // Auto-provision industry built-in services
  for (const industryType of INDUSTRY_SERVICE_TYPES) {
    const industryCfg = encrypt(JSON.stringify({
      industry: industryType.replace("built_in_", ""),
      version: "1.0",
    }));
    const label = industryType.replace("built_in_", "").replace(/_/g, " ");
    const name = `Built-in ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
    await prisma.service.create({
      data: {
        name,
        type: industryType,
        configEncrypted: industryCfg.ciphertext,
        iv: industryCfg.iv,
        authTag: industryCfg.authTag,
        organizationId: org.id,
      },
    });
  }

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
