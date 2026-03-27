import { PrismaClient, UserRole, AppStatus, ServiceType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

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
  "s3", "gcs", "azure_blob",
  "stripe", "paypal", "ecpay",
  "sendgrid", "ses", "mailgun",
  "twilio", "vonage", "aws_sns",
  "auth0", "firebase_auth", "line_login",
  "supabase", "hasura",
  "built_in_pg", "built_in_disk",
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

  for (const org of [acme, startup]) {
    const pgCfg = encrypt(JSON.stringify({
      host: "localhost",
      port: "5432",
      database: `org_${org.slug}`,
      username: `org_${org.slug}`,
      password: "platform-managed",
    }));

    await prisma.service.upsert({
      where: { id: `builtin-pg-${org.slug}` },
      update: {},
      create: {
        id: `builtin-pg-${org.slug}`,
        name: "Built-in PostgreSQL",
        type: ServiceType.built_in_pg,
        configEncrypted: pgCfg.ciphertext,
        iv: pgCfg.iv,
        authTag: pgCfg.authTag,
        organizationId: org.id,
      },
    });

    const diskCfg = encrypt(JSON.stringify({
      basePath: `/data/storage/${org.slug}`,
    }));

    await prisma.service.upsert({
      where: { id: `builtin-disk-${org.slug}` },
      update: {},
      create: {
        id: `builtin-disk-${org.slug}`,
        name: "Built-in Disk Storage",
        type: ServiceType.built_in_disk,
        configEncrypted: diskCfg.ciphertext,
        iv: diskCfg.iv,
        authTag: diskCfg.authTag,
        organizationId: org.id,
      },
    });
  }

  console.log("  ✓ Built-in services provisioned for all orgs");

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

  console.log(`  ✓ Services: ${pgService.name}, ${stripeService.name}, ${sendgridService.name}, ${s3Service.name}`);

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
