import type { ServiceType } from "@prisma/client";

export enum ServiceCategory {
  database = "database",
  storage = "storage",
  payment = "payment",
  email = "email",
  sms = "sms",
  auth = "auth",
  platform = "platform",
  chat = "chat",
  ai_model = "ai_model",
  industry = "industry",
}

export const ALL_SERVICE_TYPES: ServiceType[] = [
  // database
  "postgresql",
  "mysql",
  "mongodb",
  // storage
  "s3",
  "gcs",
  "azure_blob",
  "google_drive",
  // payment
  "stripe",
  "paypal",
  "ecpay",
  // email
  "sendgrid",
  "ses",
  "mailgun",
  // sms
  "twilio",
  "vonage",
  "aws_sns",
  // auth
  "auth0",
  "firebase_auth",
  "line_login",
  // platform
  "supabase",
  "hasura",
  // chat
  "line_bot",
  "whatsapp",
  "discord",
  "telegram",
  // built-in infrastructure
  "built_in_supabase",
  "built_in_keycloak",
  "built_in_minio",
  "built_in_n8n",
  "built_in_qdrant",
  "built_in_meilisearch",
  "built_in_posthog",
  "built_in_metabase",
  // built-in industry
  "built_in_restaurant",
  "built_in_medical",
  "built_in_beauty",
  "built_in_education",
  "built_in_realestate",
  "built_in_fitness",
  "built_in_retail",
  "built_in_hospitality",
  "built_in_legal",
  "built_in_accounting",
  "built_in_auto_repair",
  "built_in_pet_care",
  "built_in_photography",
  "built_in_cleaning",
  "built_in_logistics",
  // ai_model
  "openai",
  "gemini",
  "claude",
  "openrouter",
];

export const INDUSTRY_SERVICE_TYPES: ServiceType[] = [
  "built_in_restaurant",
  "built_in_medical",
  "built_in_beauty",
  "built_in_education",
  "built_in_realestate",
  "built_in_fitness",
  "built_in_retail",
  "built_in_hospitality",
  "built_in_legal",
  "built_in_accounting",
  "built_in_auto_repair",
  "built_in_pet_care",
  "built_in_photography",
  "built_in_cleaning",
  "built_in_logistics",
];

export const SERVICE_TYPE_CATEGORY: Record<ServiceType, ServiceCategory> = {
  postgresql: ServiceCategory.database,
  mysql: ServiceCategory.database,
  mongodb: ServiceCategory.database,
  s3: ServiceCategory.storage,
  gcs: ServiceCategory.storage,
  azure_blob: ServiceCategory.storage,
  google_drive: ServiceCategory.storage,
  stripe: ServiceCategory.payment,
  paypal: ServiceCategory.payment,
  ecpay: ServiceCategory.payment,
  sendgrid: ServiceCategory.email,
  ses: ServiceCategory.email,
  mailgun: ServiceCategory.email,
  twilio: ServiceCategory.sms,
  vonage: ServiceCategory.sms,
  aws_sns: ServiceCategory.sms,
  auth0: ServiceCategory.auth,
  firebase_auth: ServiceCategory.auth,
  line_login: ServiceCategory.auth,
  supabase: ServiceCategory.platform,
  hasura: ServiceCategory.platform,
  line_bot: ServiceCategory.chat,
  whatsapp: ServiceCategory.chat,
  discord: ServiceCategory.chat,
  telegram: ServiceCategory.chat,
  // built-in infra
  built_in_supabase: ServiceCategory.platform,
  built_in_keycloak: ServiceCategory.platform,
  built_in_minio: ServiceCategory.platform,
  built_in_n8n: ServiceCategory.platform,
  built_in_qdrant: ServiceCategory.platform,
  built_in_meilisearch: ServiceCategory.platform,
  built_in_posthog: ServiceCategory.platform,
  built_in_metabase: ServiceCategory.platform,
  // built-in industry
  built_in_restaurant: ServiceCategory.industry,
  built_in_medical: ServiceCategory.industry,
  built_in_beauty: ServiceCategory.industry,
  built_in_education: ServiceCategory.industry,
  built_in_realestate: ServiceCategory.industry,
  built_in_fitness: ServiceCategory.industry,
  built_in_retail: ServiceCategory.industry,
  built_in_hospitality: ServiceCategory.industry,
  built_in_legal: ServiceCategory.industry,
  built_in_accounting: ServiceCategory.industry,
  built_in_auto_repair: ServiceCategory.industry,
  built_in_pet_care: ServiceCategory.industry,
  built_in_photography: ServiceCategory.industry,
  built_in_cleaning: ServiceCategory.industry,
  built_in_logistics: ServiceCategory.industry,
  // ai_model
  openai: ServiceCategory.ai_model,
  gemini: ServiceCategory.ai_model,
  claude: ServiceCategory.ai_model,
  openrouter: ServiceCategory.ai_model,
};

export const CATEGORY_SERVICE_TYPES: Record<ServiceCategory, ServiceType[]> = {
  [ServiceCategory.database]: ["postgresql", "mysql", "mongodb"],
  [ServiceCategory.storage]: ["s3", "gcs", "azure_blob", "google_drive"],
  [ServiceCategory.payment]: ["stripe", "paypal", "ecpay"],
  [ServiceCategory.email]: ["sendgrid", "ses", "mailgun"],
  [ServiceCategory.sms]: ["twilio", "vonage", "aws_sns"],
  [ServiceCategory.auth]: ["auth0", "firebase_auth", "line_login"],
  [ServiceCategory.platform]: ["supabase", "hasura", "built_in_supabase", "built_in_keycloak", "built_in_minio", "built_in_n8n", "built_in_qdrant", "built_in_meilisearch", "built_in_posthog", "built_in_metabase"],
  [ServiceCategory.chat]: ["line_bot", "whatsapp", "discord", "telegram"],
  [ServiceCategory.ai_model]: ["openai", "gemini", "claude", "openrouter"],
  [ServiceCategory.industry]: INDUSTRY_SERVICE_TYPES,
};

export const BUILT_IN_INFRA_SERVICE_TYPES: ServiceType[] = [
  "built_in_supabase",
  "built_in_keycloak",
  "built_in_minio",
  "built_in_n8n",
  "built_in_qdrant",
  "built_in_meilisearch",
  "built_in_posthog",
  "built_in_metabase",
];

export const BUILT_IN_SERVICE_TYPES: ReadonlySet<ServiceType> = new Set([
  ...BUILT_IN_INFRA_SERVICE_TYPES,
  ...INDUSTRY_SERVICE_TYPES,
]);

export function isBuiltInServiceType(type: ServiceType): boolean {
  return BUILT_IN_SERVICE_TYPES.has(type);
}

export function isIndustryServiceType(type: ServiceType): boolean {
  return INDUSTRY_SERVICE_TYPES.includes(type);
}

/**
 * Built-in infra services that act as database/platform backends.
 * These should be compatible with traditional database service types.
 */
const SUPABASE_COMPATIBLE: ServiceType[] = [
  "built_in_supabase",
  "supabase",
  "postgresql",
  "mysql",
  "mongodb",
];

/**
 * Get all compatible service types in the same category.
 * e.g. "postgresql" → ["postgresql", "mysql", "mongodb", "built_in_supabase", "supabase"]
 *
 * Special cases:
 * - built_in_supabase is compatible with database types (it IS a database+platform)
 * - Other built-in infra services (metabase, posthog, etc.) only match themselves
 * - Industry services only match themselves
 */
export function getCompatibleServiceTypes(svcType: ServiceType): ServiceType[] {
  // built_in_supabase is compatible with database types and supabase
  if (svcType === "built_in_supabase" || svcType === "supabase") {
    return SUPABASE_COMPATIBLE;
  }
  // Database types are also compatible with built_in_supabase
  if (svcType === "postgresql" || svcType === "mysql" || svcType === "mongodb") {
    return SUPABASE_COMPATIBLE;
  }
  // Other built-in infra services only match themselves
  if (BUILT_IN_INFRA_SERVICE_TYPES.includes(svcType) && svcType !== "built_in_supabase") {
    return [svcType];
  }
  // Industry services only match themselves
  if (INDUSTRY_SERVICE_TYPES.includes(svcType)) {
    return [svcType];
  }
  // Default: return all types in the same category
  const category = SERVICE_TYPE_CATEGORY[svcType];
  if (!category) return [svcType];
  return CATEGORY_SERVICE_TYPES[category] || [svcType];
}

export interface ConfigFieldDef {
  key: string;
  type: "text" | "password";
  placeholder: string;
  required?: boolean;
}

/**
 * Per-type config field definitions.
 * endpointUrl is always shown separately; these are the extra fields.
 */
export const SERVICE_TYPE_CONFIG_FIELDS: Record<ServiceType, ConfigFieldDef[]> = {
  // --- database ---
  postgresql: [
    { key: "host", type: "text", placeholder: "localhost" },
    { key: "port", type: "text", placeholder: "5432" },
    { key: "database", type: "text", placeholder: "mydb" },
    { key: "username", type: "text", placeholder: "user" },
    { key: "password", type: "password", placeholder: "********" },
  ],
  mysql: [
    { key: "host", type: "text", placeholder: "localhost" },
    { key: "port", type: "text", placeholder: "3306" },
    { key: "database", type: "text", placeholder: "mydb" },
    { key: "username", type: "text", placeholder: "root" },
    { key: "password", type: "password", placeholder: "********" },
  ],
  mongodb: [
    { key: "connectionString", type: "password", placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/db" },
  ],
  // --- storage ---
  s3: [
    { key: "accessKeyId", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE" },
    { key: "secretAccessKey", type: "password", placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    { key: "bucket", type: "text", placeholder: "my-bucket" },
    { key: "region", type: "text", placeholder: "us-east-1" },
  ],
  gcs: [
    { key: "projectId", type: "text", placeholder: "my-gcp-project" },
    { key: "clientEmail", type: "text", placeholder: "sa@project.iam.gserviceaccount.com" },
    { key: "privateKey", type: "password", placeholder: "-----BEGIN PRIVATE KEY-----..." },
    { key: "bucket", type: "text", placeholder: "my-bucket" },
  ],
  azure_blob: [
    { key: "accountName", type: "text", placeholder: "mystorageaccount" },
    { key: "accountKey", type: "password", placeholder: "base64-encoded-key" },
    { key: "containerName", type: "text", placeholder: "my-container" },
  ],
  google_drive: [
    { key: "clientId", type: "text", placeholder: "your-client-id.apps.googleusercontent.com" },
    { key: "clientSecret", type: "password", placeholder: "your-client-secret" },
    { key: "refreshToken", type: "password", placeholder: "your-refresh-token" },
    { key: "folderId", type: "text", placeholder: "folder-id (optional)" },
  ],
  // --- payment ---
  stripe: [
    { key: "apiKey", type: "password", placeholder: "sk_..." },
    { key: "webhookSecret", type: "password", placeholder: "whsec_..." },
  ],
  paypal: [
    { key: "clientId", type: "text", placeholder: "AaBbCcDdEeFf..." },
    { key: "clientSecret", type: "password", placeholder: "EeFfGgHhIiJj..." },
    { key: "mode", type: "text", placeholder: "sandbox" },
  ],
  ecpay: [
    { key: "merchantId", type: "text", placeholder: "2000132" },
    { key: "hashKey", type: "password", placeholder: "5294y06JbISpM5x9" },
    { key: "hashIV", type: "password", placeholder: "v77hoKGq4kWxNNIS" },
  ],
  // --- email ---
  sendgrid: [
    { key: "apiKey", type: "password", placeholder: "SG.xxxxx" },
    { key: "fromEmail", type: "text", placeholder: "noreply@example.com" },
  ],
  ses: [
    { key: "accessKeyId", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE" },
    { key: "secretAccessKey", type: "password", placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    { key: "region", type: "text", placeholder: "us-east-1" },
    { key: "fromEmail", type: "text", placeholder: "noreply@example.com" },
  ],
  mailgun: [
    { key: "apiKey", type: "password", placeholder: "key-xxxxx" },
    { key: "domain", type: "text", placeholder: "mg.example.com" },
    { key: "fromEmail", type: "text", placeholder: "noreply@example.com" },
  ],
  // --- sms ---
  twilio: [
    { key: "accountSid", type: "text", placeholder: "ACxxxxx" },
    { key: "authToken", type: "password", placeholder: "your-auth-token" },
    { key: "fromNumber", type: "text", placeholder: "+15551234567" },
  ],
  vonage: [
    { key: "apiKey", type: "text", placeholder: "abcd1234" },
    { key: "apiSecret", type: "password", placeholder: "your-api-secret" },
    { key: "fromNumber", type: "text", placeholder: "+15551234567" },
  ],
  aws_sns: [
    { key: "accessKeyId", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE" },
    { key: "secretAccessKey", type: "password", placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    { key: "region", type: "text", placeholder: "us-east-1" },
  ],
  // --- auth ---
  auth0: [
    { key: "domain", type: "text", placeholder: "my-tenant.auth0.com" },
    { key: "clientId", type: "text", placeholder: "your-client-id" },
    { key: "clientSecret", type: "password", placeholder: "your-client-secret" },
  ],
  firebase_auth: [
    { key: "projectId", type: "text", placeholder: "my-firebase-project" },
    { key: "apiKey", type: "text", placeholder: "AIzaSyB..." },
    { key: "authDomain", type: "text", placeholder: "my-project.firebaseapp.com" },
  ],
  line_login: [
    { key: "channelId", type: "text", placeholder: "1234567890" },
    { key: "channelSecret", type: "password", placeholder: "your-channel-secret" },
    { key: "callbackUrl", type: "text", placeholder: "https://example.com/callback" },
  ],
  // --- platform ---
  supabase: [
    { key: "projectUrl", type: "text", placeholder: "https://xxx.supabase.co" },
    { key: "apiKey", type: "password", placeholder: "your-anon-key" },
  ],
  hasura: [
    { key: "adminSecret", type: "password", placeholder: "your-admin-secret" },
  ],
  // --- chat ---
  line_bot: [
    { key: "channelAccessToken", type: "password", placeholder: "your-channel-access-token" },
    { key: "channelSecret", type: "password", placeholder: "your-channel-secret" },
  ],
  whatsapp: [
    { key: "phoneNumberId", type: "text", placeholder: "123456789012345" },
    { key: "accessToken", type: "password", placeholder: "your-access-token" },
    { key: "verifyToken", type: "text", placeholder: "your-verify-token" },
  ],
  discord: [
    { key: "botToken", type: "password", placeholder: "your-bot-token" },
    { key: "applicationId", type: "text", placeholder: "123456789012345678" },
  ],
  telegram: [
    { key: "botToken", type: "password", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
  ],
  // built-in (auto-configured by platform)
  built_in_supabase: [],
  built_in_keycloak: [],
  built_in_minio: [],
  built_in_n8n: [],
  built_in_qdrant: [],
  built_in_meilisearch: [],
  built_in_posthog: [],
  built_in_metabase: [],
  // built-in industry (auto-configured by platform)
  built_in_restaurant: [],
  built_in_medical: [],
  built_in_beauty: [],
  built_in_education: [],
  built_in_realestate: [],
  built_in_fitness: [],
  built_in_retail: [],
  built_in_hospitality: [],
  built_in_legal: [],
  built_in_accounting: [],
  built_in_auto_repair: [],
  built_in_pet_care: [],
  built_in_photography: [],
  built_in_cleaning: [],
  built_in_logistics: [],
  // --- ai_model ---
  openai: [
    { key: "apiKey", type: "password", placeholder: "sk-..." },
    { key: "organizationId", type: "text", placeholder: "org-..." },
    { key: "model", type: "text", placeholder: "gpt-4o" },
  ],
  gemini: [
    { key: "apiKey", type: "password", placeholder: "AIzaSy..." },
    { key: "model", type: "text", placeholder: "gemini-2.0-flash" },
  ],
  claude: [
    { key: "apiKey", type: "password", placeholder: "sk-ant-..." },
    { key: "model", type: "text", placeholder: "claude-sonnet-4-20250514" },
  ],
  openrouter: [
    { key: "apiKey", type: "password", placeholder: "sk-or-..." },
    { key: "model", type: "text", placeholder: "openai/gpt-4o" },
  ],
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  s3: "S3 Storage",
  gcs: "Google Cloud Storage",
  azure_blob: "Azure Blob Storage",
  google_drive: "Google Drive",
  stripe: "Stripe",
  paypal: "PayPal",
  ecpay: "ECPay",
  sendgrid: "SendGrid",
  ses: "Amazon SES",
  mailgun: "Mailgun",
  twilio: "Twilio",
  vonage: "Vonage",
  aws_sns: "Amazon SNS",
  auth0: "Auth0",
  firebase_auth: "Firebase Auth",
  line_login: "LINE Login",
  supabase: "Supabase",
  hasura: "Hasura",
  line_bot: "LINE Bot",
  whatsapp: "WhatsApp",
  discord: "Discord",
  telegram: "Telegram",
  built_in_supabase: "Built-in Supabase",
  built_in_keycloak: "Built-in Keycloak",
  built_in_minio: "Built-in MinIO",
  built_in_n8n: "Built-in n8n",
  built_in_qdrant: "Built-in Qdrant",
  built_in_meilisearch: "Built-in Meilisearch",
  built_in_posthog: "Built-in PostHog",
  built_in_metabase: "Built-in Metabase",
  built_in_restaurant: "Built-in Restaurant",
  built_in_medical: "Built-in Medical",
  built_in_beauty: "Built-in Beauty",
  built_in_education: "Built-in Education",
  built_in_realestate: "Built-in Real Estate",
  built_in_fitness: "Built-in Fitness",
  built_in_retail: "Built-in Retail",
  built_in_hospitality: "Built-in Hospitality",
  built_in_legal: "Built-in Legal",
  built_in_accounting: "Built-in Accounting",
  built_in_auto_repair: "Built-in Auto Repair",
  built_in_pet_care: "Built-in Pet Care",
  built_in_photography: "Built-in Photography",
  built_in_cleaning: "Built-in Cleaning",
  built_in_logistics: "Built-in Logistics",
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Claude (Anthropic)",
  openrouter: "OpenRouter",
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.database]: "Database",
  [ServiceCategory.storage]: "Storage",
  [ServiceCategory.payment]: "Payment",
  [ServiceCategory.email]: "Email",
  [ServiceCategory.sms]: "SMS",
  [ServiceCategory.auth]: "Authentication",
  [ServiceCategory.platform]: "Platform",
  [ServiceCategory.chat]: "Chat",
  [ServiceCategory.ai_model]: "AI Model",
  [ServiceCategory.industry]: "Industry",
};

/**
 * How the service is accessed over HTTP.
 * - "user-provided": user supplies an endpointUrl (e.g. Supabase, Hasura, Auth0)
 * - "fixed": service has a well-known API URL, user only provides credentials
 * - "proxy": no HTTP API — we build an HTTP proxy layer automatically
 * - "sdk": requires SDK with complex auth, config-only for now
 */
export type HttpMode = "user-provided" | "fixed" | "proxy" | "sdk";

export const SERVICE_TYPE_HTTP_MODE: Record<ServiceType, HttpMode> = {
  // database — no HTTP API, needs proxy
  postgresql: "proxy",
  mysql: "proxy",
  mongodb: "proxy",
  // storage — SDK-based with complex auth (SigV4, OAuth2, SharedKey)
  s3: "sdk",
  gcs: "sdk",
  azure_blob: "sdk",
  google_drive: "sdk",
  // payment — fixed well-known API URLs
  stripe: "fixed",
  paypal: "fixed",
  ecpay: "sdk",
  // email — fixed well-known API URLs
  sendgrid: "fixed",
  ses: "sdk",
  mailgun: "fixed",
  // sms — fixed well-known API URLs
  twilio: "fixed",
  vonage: "fixed",
  aws_sns: "sdk",
  // auth — user provides domain/endpoint
  auth0: "user-provided",
  firebase_auth: "sdk",
  line_login: "sdk",
  // platform — user provides project URL / endpoint
  supabase: "user-provided",
  hasura: "user-provided",
  // chat — fixed well-known API URLs
  line_bot: "fixed",
  whatsapp: "fixed",
  discord: "fixed",
  telegram: "fixed",
  // built-in infra
  built_in_supabase: "user-provided",
  built_in_keycloak: "user-provided",
  built_in_minio: "user-provided",
  built_in_n8n: "user-provided",
  built_in_qdrant: "user-provided",
  built_in_meilisearch: "user-provided",
  built_in_posthog: "user-provided",
  built_in_metabase: "user-provided",
  // built-in industry — all accessed via proxy
  built_in_restaurant: "proxy",
  built_in_medical: "proxy",
  built_in_beauty: "proxy",
  built_in_education: "proxy",
  built_in_realestate: "proxy",
  built_in_fitness: "proxy",
  built_in_retail: "proxy",
  built_in_hospitality: "proxy",
  built_in_legal: "proxy",
  built_in_accounting: "proxy",
  built_in_auto_repair: "proxy",
  built_in_pet_care: "proxy",
  built_in_photography: "proxy",
  built_in_cleaning: "proxy",
  built_in_logistics: "proxy",
  // ai_model — fixed well-known API URLs
  openai: "fixed",
  gemini: "fixed",
  claude: "fixed",
  openrouter: "fixed",
};

export const FIXED_ENDPOINT_URLS: Partial<Record<ServiceType, string>> = {
  stripe: "https://api.stripe.com",
  paypal: "https://api-m.paypal.com",
  sendgrid: "https://api.sendgrid.com",
  mailgun: "https://api.mailgun.net",
  twilio: "https://api.twilio.com",
  vonage: "https://rest.nexmo.com",
  line_bot: "https://api.line.me",
  whatsapp: "https://graph.facebook.com",
  discord: "https://discord.com/api",
  telegram: "https://api.telegram.org",
  openai: "https://api.openai.com",
  gemini: "https://generativelanguage.googleapis.com",
  claude: "https://api.anthropic.com",
  openrouter: "https://openrouter.ai/api",
};

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE for env var names.
 */
export function toScreamingSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}
