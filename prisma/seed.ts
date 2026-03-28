import { PrismaClient, UserRole, AppStatus, ServiceType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { provisionSupabaseProject } from "../src/lib/builtin-supabase";
import { provisionKeycloakRealm } from "../src/lib/builtin-keycloak";
import { provisionMinioBucket } from "../src/lib/builtin-minio";
import { provisionN8nWorkspace } from "../src/lib/builtin-n8n";
import { provisionQdrantCollection } from "../src/lib/builtin-qdrant";
import { provisionMeilisearchIndex } from "../src/lib/builtin-meilisearch";
import { provisionPostHogProject } from "../src/lib/builtin-posthog";
import { provisionMetabaseGroup } from "../src/lib/builtin-metabase";

const prisma = new PrismaClient();

// ── Encryption helpers (mirrors src/lib/crypto.ts) ──────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set (at least 32 chars)");
  }
  return crypto.scryptSync(keyHex, "aigo-salt", 32);
}

function encrypt(plaintext: string) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// ── All service types for allowed-service seeding ───────────────────────────

const ALL_SERVICE_TYPES: ServiceType[] = [
  "postgresql", "mysql", "mongodb",
  "s3", "gcs", "azure_blob", "google_drive",
  "stripe", "paypal", "ecpay",
  "sendgrid", "ses", "mailgun",
  "twilio", "vonage", "aws_sns",
  "auth0", "firebase_auth", "line_login",
  "supabase", "hasura",
  "line_bot", "whatsapp", "discord", "telegram",
  "built_in_supabase",
  "built_in_keycloak", "built_in_minio", "built_in_n8n",
  "built_in_qdrant", "built_in_meilisearch", "built_in_posthog", "built_in_metabase",
  "built_in_restaurant", "built_in_medical", "built_in_beauty",
  "built_in_education", "built_in_realestate", "built_in_fitness",
  "built_in_retail", "built_in_hospitality", "built_in_legal",
  "built_in_accounting", "built_in_auto_repair", "built_in_pet_care",
  "built_in_photography", "built_in_cleaning", "built_in_logistics",
  "openai", "gemini", "claude", "openrouter",
];

const INDUSTRY_SERVICES: { type: ServiceType; name: string }[] = [
  { type: "built_in_restaurant", name: "Built-in Restaurant" },
  { type: "built_in_medical", name: "Built-in Medical" },
  { type: "built_in_beauty", name: "Built-in Beauty" },
  { type: "built_in_education", name: "Built-in Education" },
  { type: "built_in_realestate", name: "Built-in Real Estate" },
  { type: "built_in_fitness", name: "Built-in Fitness" },
  { type: "built_in_retail", name: "Built-in Retail" },
  { type: "built_in_hospitality", name: "Built-in Hospitality" },
  { type: "built_in_legal", name: "Built-in Legal" },
  { type: "built_in_accounting", name: "Built-in Accounting" },
  { type: "built_in_auto_repair", name: "Built-in Auto Repair" },
  { type: "built_in_pet_care", name: "Built-in Pet Care" },
  { type: "built_in_photography", name: "Built-in Photography" },
  { type: "built_in_cleaning", name: "Built-in Cleaning" },
  { type: "built_in_logistics", name: "Built-in Logistics" },
];

// ── Main seed ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding development database...\n");

  // ── 1. Organizations ────────────────────────────────────────────────────

  const acme = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
    },
  });

  const startup = await prisma.organization.upsert({
    where: { slug: "cool-startup" },
    update: {},
    create: {
      name: "Cool Startup",
      slug: "cool-startup",
    },
  });

  console.log(`  ✓ Organizations: ${acme.name}, ${startup.name}`);

  // ── 2. Allowed services for each org ────────────────────────────────────

  for (const org of [acme, startup]) {
    for (const serviceType of ALL_SERVICE_TYPES) {
      await prisma.orgAllowedService.upsert({
        where: {
          organizationId_serviceType: {
            organizationId: org.id,
            serviceType,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          serviceType,
          enabled: true,
        },
      });
    }
  }

  console.log("  ✓ Allowed services configured for all orgs");

  // ── 2b. Built-in services for each org ────────────────────────────────

  try {
    for (const org of [acme, startup]) {
      // Built-in Supabase
      const supabaseCreds = await provisionSupabaseProject(org.slug);
      const supabaseCfg = encrypt(JSON.stringify({
        projectUrl: supabaseCreds.projectUrl,
        apiKey: supabaseCreds.apiKey,
        serviceRoleKey: supabaseCreds.serviceRoleKey,
      }));

      await prisma.service.upsert({
        where: { id: `builtin-supabase-${org.slug}` },
        update: {
          endpointUrl: supabaseCreds.projectUrl,
          configEncrypted: supabaseCfg.ciphertext,
          iv: supabaseCfg.iv,
          authTag: supabaseCfg.authTag,
        },
        create: {
          id: `builtin-supabase-${org.slug}`,
          name: "Built-in Supabase",
          type: ServiceType.built_in_supabase,
          endpointUrl: supabaseCreds.projectUrl,
          configEncrypted: supabaseCfg.ciphertext,
          iv: supabaseCfg.iv,
          authTag: supabaseCfg.authTag,
          organizationId: org.id,
        },
      });
    }
  } catch (err) {
    console.log(`  ⚠ Skipping built-in Supabase provisioning: ${err instanceof Error ? err.message : err}`);
  }

  // Built-in infrastructure services for each org
  const INFRA_SERVICES: { type: ServiceType; name: string; idPrefix: string; provision: (slug: string) => Promise<Record<string, unknown>>; endpointUrlKey?: string }[] = [
    { type: "built_in_keycloak" as ServiceType, name: "Built-in Keycloak", idPrefix: "builtin-keycloak", provision: async (slug) => { const c = await provisionKeycloakRealm(slug); return { url: c.url, realm: c.realm, clientId: c.clientId, clientSecret: c.clientSecret }; }, endpointUrlKey: "url" },
    { type: "built_in_minio" as ServiceType, name: "Built-in MinIO", idPrefix: "builtin-minio", provision: async (slug) => { const c = await provisionMinioBucket(slug); return { endpoint: c.endpoint, accessKey: c.accessKey, secretKey: c.secretKey, bucket: c.bucket }; }, endpointUrlKey: "endpoint" },
    { type: "built_in_n8n" as ServiceType, name: "Built-in n8n", idPrefix: "builtin-n8n", provision: async (slug) => { const c = await provisionN8nWorkspace(slug); return { url: c.url, apiKey: c.apiKey, webhookUrl: c.webhookUrl }; }, endpointUrlKey: "url" },
    { type: "built_in_qdrant" as ServiceType, name: "Built-in Qdrant", idPrefix: "builtin-qdrant", provision: async (slug) => { const c = await provisionQdrantCollection(slug); return { url: c.url, apiKey: c.apiKey, collectionPrefix: c.collectionPrefix }; }, endpointUrlKey: "url" },
    { type: "built_in_meilisearch" as ServiceType, name: "Built-in Meilisearch", idPrefix: "builtin-meilisearch", provision: async (slug) => { const c = await provisionMeilisearchIndex(slug); return { url: c.url, apiKey: c.apiKey, indexPrefix: c.indexPrefix }; }, endpointUrlKey: "url" },
    { type: "built_in_posthog" as ServiceType, name: "Built-in PostHog", idPrefix: "builtin-posthog", provision: async (slug) => { const c = await provisionPostHogProject(slug); return { url: c.url, apiKey: c.apiKey, projectId: c.projectId }; }, endpointUrlKey: "url" },
    { type: "built_in_metabase" as ServiceType, name: "Built-in Metabase", idPrefix: "builtin-metabase", provision: async (slug) => { const c = await provisionMetabaseGroup(slug); return { url: c.url, apiKey: c.apiKey, groupName: c.groupName }; }, endpointUrlKey: "url" },
  ];

  try {
    for (const org of [acme, startup]) {
      for (const svc of INFRA_SERVICES) {
        const creds = await svc.provision(org.slug);
        const cfg = encrypt(JSON.stringify(creds));
        await prisma.service.upsert({
          where: { id: `${svc.idPrefix}-${org.slug}` },
          update: {
            endpointUrl: svc.endpointUrlKey ? (creds[svc.endpointUrlKey] as string) : undefined,
            configEncrypted: cfg.ciphertext,
            iv: cfg.iv,
            authTag: cfg.authTag,
          },
          create: {
            id: `${svc.idPrefix}-${org.slug}`,
            name: svc.name,
            type: svc.type,
            endpointUrl: svc.endpointUrlKey ? (creds[svc.endpointUrlKey] as string) : undefined,
            configEncrypted: cfg.ciphertext,
            iv: cfg.iv,
            authTag: cfg.authTag,
            organizationId: org.id,
          },
        });
      }
    }
    console.log("  ✓ Built-in infrastructure services provisioned (Keycloak, MinIO, n8n, Qdrant, Meilisearch, PostHog, Metabase)");
  } catch (err) {
    console.log(`  ⚠ Skipping some built-in infra services: ${err instanceof Error ? err.message : err}`);
  }

  // Industry built-in services for each org
  for (const org of [acme, startup]) {
    for (const svc of INDUSTRY_SERVICES) {
      const industryCfg = encrypt(JSON.stringify({
        industry: svc.type.replace("built_in_", ""),
        version: "1.0",
      }));

      await prisma.service.upsert({
        where: { id: `${svc.type}-${org.slug}` },
        update: {},
        create: {
          id: `${svc.type}-${org.slug}`,
          name: svc.name,
          type: svc.type,
          configEncrypted: industryCfg.ciphertext,
          iv: industryCfg.iv,
          authTag: industryCfg.authTag,
          organizationId: org.id,
        },
      });
    }
  }

  console.log("  ✓ Built-in services provisioned for all orgs (including 15 industry services)");

  // ── 3. Users ────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
      role: UserRole.admin,
      organizationId: acme.id,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Chen",
      passwordHash,
      role: UserRole.user,
      organizationId: acme.id,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Wang",
      passwordHash,
      role: UserRole.admin,
      organizationId: startup.id,
    },
  });

  console.log(`  ✓ Users: ${admin.name} (admin), ${alice.name} (user), ${bob.name} (admin)`);
  console.log(`    Login: any email above + password "password123"\n`);

  // ── 4. Services (encrypted config) ──────────────────────────────────────

  const pgConfig = encrypt(JSON.stringify({
    host: "localhost",
    port: "5432",
    database: "myapp_db",
    username: "app_user",
    password: "s3cret",
  }));

  const pgService = await prisma.service.upsert({
    where: { id: "seed-svc-pg" },
    update: {},
    create: {
      id: "seed-svc-pg",
      name: "Main PostgreSQL",
      type: ServiceType.postgresql,
      endpointUrl: "postgresql://localhost:5432/myapp_db",
      configEncrypted: pgConfig.ciphertext,
      iv: pgConfig.iv,
      authTag: pgConfig.authTag,
      organizationId: acme.id,
    },
  });

  const stripeConfig = encrypt(JSON.stringify({
    apiKey: "sk_test_fake_stripe_key_123456",
    webhookSecret: "whsec_fake_webhook_secret",
  }));

  const stripeService = await prisma.service.upsert({
    where: { id: "seed-svc-stripe" },
    update: {},
    create: {
      id: "seed-svc-stripe",
      name: "Stripe Payment",
      type: ServiceType.stripe,
      configEncrypted: stripeConfig.ciphertext,
      iv: stripeConfig.iv,
      authTag: stripeConfig.authTag,
      organizationId: acme.id,
    },
  });

  const sendgridConfig = encrypt(JSON.stringify({
    apiKey: "SG.fake_sendgrid_key_for_dev",
  }));

  const sendgridService = await prisma.service.upsert({
    where: { id: "seed-svc-sendgrid" },
    update: {},
    create: {
      id: "seed-svc-sendgrid",
      name: "SendGrid Email",
      type: ServiceType.sendgrid,
      configEncrypted: sendgridConfig.ciphertext,
      iv: sendgridConfig.iv,
      authTag: sendgridConfig.authTag,
      organizationId: acme.id,
    },
  });

  const s3Config = encrypt(JSON.stringify({
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    bucket: "my-app-uploads",
    region: "ap-northeast-1",
  }));

  const s3Service = await prisma.service.upsert({
    where: { id: "seed-svc-s3" },
    update: {},
    create: {
      id: "seed-svc-s3",
      name: "AWS S3 Storage",
      type: ServiceType.s3,
      configEncrypted: s3Config.ciphertext,
      iv: s3Config.iv,
      authTag: s3Config.authTag,
      organizationId: startup.id,
    },
  });

  const openaiConfig = encrypt(JSON.stringify({
    apiKey: "sk-fake-openai-key-for-dev",
    model: "gpt-4o",
  }));

  const openaiService = await prisma.service.upsert({
    where: { id: "seed-svc-openai" },
    update: {},
    create: {
      id: "seed-svc-openai",
      name: "OpenAI GPT",
      type: ServiceType.openai,
      configEncrypted: openaiConfig.ciphertext,
      iv: openaiConfig.iv,
      authTag: openaiConfig.authTag,
      organizationId: acme.id,
    },
  });

  console.log(`  ✓ Services: ${pgService.name}, ${stripeService.name}, ${sendgridService.name}, ${s3Service.name}, ${openaiService.name}`);

  // ── 5. Apps ─────────────────────────────────────────────────────────────

  const ecommerce = await prisma.app.upsert({
    where: { slug: "ecommerce-demo" },
    update: {},
    create: {
      name: "E-Commerce Demo",
      slug: "ecommerce-demo",
      description: "A demo online store with product catalog and checkout flow",
      template: "nextjs",
      status: AppStatus.running,
      port: 4001,
      config: { framework: "nextjs", nodeVersion: "20" },
      userId: admin.id,
    },
  });

  const blog = await prisma.app.upsert({
    where: { slug: "company-blog" },
    update: {},
    create: {
      name: "Company Blog",
      slug: "company-blog",
      description: "Corporate blog with CMS integration",
      template: "nextjs",
      status: AppStatus.stopped,
      port: 4002,
      config: { framework: "nextjs", nodeVersion: "20" },
      userId: alice.id,
    },
  });

  const dashboard = await prisma.app.upsert({
    where: { slug: "analytics-dashboard" },
    update: {},
    create: {
      name: "Analytics Dashboard",
      slug: "analytics-dashboard",
      description: "Internal analytics and reporting tool",
      template: "nextjs",
      status: AppStatus.developing,
      config: { framework: "nextjs", nodeVersion: "20" },
      userId: admin.id,
    },
  });

  const landing = await prisma.app.upsert({
    where: { slug: "startup-landing" },
    update: {},
    create: {
      name: "Startup Landing Page",
      slug: "startup-landing",
      description: "Product landing page with waitlist signup",
      template: "nextjs",
      status: AppStatus.running,
      port: 4003,
      config: { framework: "nextjs", nodeVersion: "20" },
      userId: bob.id,
    },
  });

  console.log(`  ✓ Apps: ${ecommerce.name} (running), ${blog.name} (stopped), ${dashboard.name} (developing), ${landing.name} (running)`);

  // ── 6. App ↔ Service mappings ───────────────────────────────────────────

  const appServices = [
    { appId: ecommerce.id, serviceId: pgService.id, envVarPrefix: "DB" },
    { appId: ecommerce.id, serviceId: stripeService.id, envVarPrefix: "STRIPE" },
    { appId: ecommerce.id, serviceId: sendgridService.id, envVarPrefix: "EMAIL" },
    { appId: blog.id, serviceId: pgService.id, envVarPrefix: "DB" },
    { appId: dashboard.id, serviceId: pgService.id, envVarPrefix: "DB" },
    { appId: landing.id, serviceId: s3Service.id, envVarPrefix: "S3" },
  ];

  for (const as of appServices) {
    await prisma.appService.upsert({
      where: { appId_serviceId: { appId: as.appId, serviceId: as.serviceId } },
      update: {},
      create: as,
    });
  }

  console.log("  ✓ App-Service mappings configured");

  // ── 7. Domains ──────────────────────────────────────────────────────────

  await prisma.orgDomain.upsert({
    where: { domain: "shop.acme-corp.dev" },
    update: {},
    create: {
      domain: "shop.acme-corp.dev",
      isActive: true,
      sslStatus: "active",
      organizationId: acme.id,
    },
  });

  await prisma.orgDomain.upsert({
    where: { domain: "blog.acme-corp.dev" },
    update: {},
    create: {
      domain: "blog.acme-corp.dev",
      isActive: true,
      sslStatus: "active",
      organizationId: acme.id,
    },
  });

  await prisma.orgDomain.upsert({
    where: { domain: "app.coolstartup.io" },
    update: {},
    create: {
      domain: "app.coolstartup.io",
      isActive: false,
      sslStatus: "pending",
      organizationId: startup.id,
    },
  });

  console.log("  ✓ Domains configured");

  // ── 8. Chat messages (stable IDs for idempotency) ───────────────────────

  const chatMessages = [
    {
      id: "seed-chat-1",
      role: "user",
      content: "Create an e-commerce store with product listing and shopping cart",
      appId: ecommerce.id,
      userId: admin.id,
    },
    {
      id: "seed-chat-2",
      role: "assistant",
      content: "I'll set up a Next.js e-commerce app with product catalog, shopping cart, and checkout. Let me scaffold the project for you.",
      appId: ecommerce.id,
      userId: null,
    },
    {
      id: "seed-chat-3",
      role: "user",
      content: "Add Stripe payment integration",
      appId: ecommerce.id,
      userId: admin.id,
    },
    {
      id: "seed-chat-4",
      role: "assistant",
      content: "I've integrated Stripe checkout. The store now supports credit card payments with test mode enabled.",
      appId: ecommerce.id,
      userId: null,
    },
    {
      id: "seed-chat-5",
      role: "user",
      content: "Build a blog with markdown support",
      appId: blog.id,
      userId: alice.id,
    },
    {
      id: "seed-chat-6",
      role: "assistant",
      content: "Setting up a blog application with MDX support, syntax highlighting, and a simple CMS dashboard.",
      appId: blog.id,
      userId: null,
    },
  ];

  for (const msg of chatMessages) {
    await prisma.chatMessage.upsert({
      where: { id: msg.id },
      update: {},
      create: msg,
    });
  }

  console.log("  ✓ Chat messages seeded");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Quick reference:");
  console.log("   admin@example.com  / password123  (admin, Acme Corp)");
  console.log("   alice@example.com  / password123  (user,  Acme Corp)");
  console.log("   bob@example.com    / password123  (admin, Cool Startup)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
