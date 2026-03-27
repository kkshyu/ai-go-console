import type { ServiceType } from "@prisma/client";

export enum ServiceCategory {
  database = "database",
  storage = "storage",
  payment = "payment",
  email = "email",
  sms = "sms",
  auth = "auth",
  platform = "platform",
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
  // built-in
  "built_in_pg",
  "built_in_disk",
];

export const SERVICE_TYPE_CATEGORY: Record<ServiceType, ServiceCategory> = {
  postgresql: ServiceCategory.database,
  mysql: ServiceCategory.database,
  mongodb: ServiceCategory.database,
  s3: ServiceCategory.storage,
  gcs: ServiceCategory.storage,
  azure_blob: ServiceCategory.storage,
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
  // built-in
  built_in_pg: ServiceCategory.database,
  built_in_disk: ServiceCategory.storage,
};

export const CATEGORY_SERVICE_TYPES: Record<ServiceCategory, ServiceType[]> = {
  [ServiceCategory.database]: ["postgresql", "mysql", "mongodb", "built_in_pg"],
  [ServiceCategory.storage]: ["s3", "gcs", "azure_blob", "built_in_disk"],
  [ServiceCategory.payment]: ["stripe", "paypal", "ecpay"],
  [ServiceCategory.email]: ["sendgrid", "ses", "mailgun"],
  [ServiceCategory.sms]: ["twilio", "vonage", "aws_sns"],
  [ServiceCategory.auth]: ["auth0", "firebase_auth", "line_login"],
  [ServiceCategory.platform]: ["supabase", "hasura"],
};

export const BUILT_IN_SERVICE_TYPES: ReadonlySet<ServiceType> = new Set([
  "built_in_pg",
  "built_in_disk",
]);

export function isBuiltInServiceType(type: ServiceType): boolean {
  return BUILT_IN_SERVICE_TYPES.has(type);
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
  // built-in (auto-configured by platform)
  built_in_pg: [],
  built_in_disk: [],
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  s3: "S3 Storage",
  gcs: "Google Cloud Storage",
  azure_blob: "Azure Blob Storage",
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
  built_in_pg: "Built-in PostgreSQL",
  built_in_disk: "Built-in Disk Storage",
};

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  [ServiceCategory.database]: "Database",
  [ServiceCategory.storage]: "Storage",
  [ServiceCategory.payment]: "Payment",
  [ServiceCategory.email]: "Email",
  [ServiceCategory.sms]: "SMS",
  [ServiceCategory.auth]: "Authentication",
  [ServiceCategory.platform]: "Platform",
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
  // built-in
  built_in_pg: "proxy",
  built_in_disk: "sdk",
};

export const FIXED_ENDPOINT_URLS: Partial<Record<ServiceType, string>> = {
  stripe: "https://api.stripe.com",
  paypal: "https://api-m.paypal.com",
  sendgrid: "https://api.sendgrid.com",
  mailgun: "https://api.mailgun.net",
  twilio: "https://api.twilio.com",
  vonage: "https://rest.nexmo.com",
};

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE for env var names.
 */
export function toScreamingSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}
