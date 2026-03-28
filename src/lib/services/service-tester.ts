/**
 * Service Tester — reusable service connectivity testing logic.
 *
 * Extracted from the API route so it can also be used server-side
 * (e.g. probing all service instances before architect runs).
 */

import { getDbDriver, getMongoDriver } from "@/lib/db-drivers";
import { decrypt } from "@/lib/crypto";
import type { ServiceType } from "@prisma/client";

// ---- Types ----

export interface TestResult {
  success: boolean;
  message: string;
}

export type ServiceTester = (
  config: Record<string, string>,
  endpointUrl: string | null,
) => Promise<TestResult>;

export interface ProbeResult {
  serviceId: string;
  status: "ok" | "failed" | "untested";
  message: string;
}

// ---- Helpers ----

/**
 * Config-only validation (no network call).
 */
function configOnlyTester(
  label: string,
  requiredFields: string[],
): ServiceTester {
  return async (config) => {
    const missing = requiredFields.filter((f) => !config[f]);
    if (missing.length > 0) {
      return {
        success: false,
        message: `${label}: missing fields: ${missing.join(", ")}`,
      };
    }
    return { success: true, message: `${label} configuration valid` };
  };
}

// ---- Testers (one per ServiceType) ----

export const testers: Record<ServiceType, ServiceTester> = {
  // --- database (direct TCP connection test) ---
  postgresql: async (config) => {
    const driver = getDbDriver("postgresql");
    await driver.testConnection(config);
    return { success: true, message: "PostgreSQL connection OK" };
  },
  mysql: async (config) => {
    const driver = getDbDriver("mysql");
    await driver.testConnection(config);
    return { success: true, message: "MySQL connection OK" };
  },
  mongodb: async (config) => {
    const driver = getMongoDriver();
    await driver.testConnection(config);
    return { success: true, message: "MongoDB connection OK" };
  },

  // --- storage ---
  s3: async (config, endpointUrl) => {
    const url = endpointUrl || config.endpointUrl;
    if (!url) throw new Error("S3 endpoint URL not configured");
    const res = await fetch(url, {
      method: "GET",
      headers:
        config.accessKeyId && config.secretAccessKey
          ? {
              Authorization: `AWS ${config.accessKeyId}:${config.secretAccessKey}`,
            }
          : config.apiKey
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {},
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status < 500) {
      return { success: true, message: "S3 endpoint reachable" };
    }
    throw new Error(`S3 endpoint returned ${res.status}`);
  },
  gcs: configOnlyTester("Google Cloud Storage", ["projectId", "bucket"]),
  azure_blob: configOnlyTester("Azure Blob Storage", [
    "accountName",
    "accountKey",
    "containerName",
  ]),
  google_drive: configOnlyTester("Google Drive", [
    "clientId",
    "clientSecret",
  ]),

  // --- payment ---
  stripe: async (config, endpointUrl) => {
    const url = endpointUrl || "https://api.stripe.com/v1/balance";
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.apiKey || ""}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Stripe API connection OK" };
    }
    throw new Error(`Stripe returned ${res.status}`);
  },
  paypal: async (config) => {
    const mode = config.mode === "live" ? "api-m" : "api-m.sandbox";
    const url = `https://${mode}.paypal.com/v1/oauth2/token`;
    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "PayPal API connection OK" };
    }
    throw new Error(`PayPal returned ${res.status}`);
  },
  ecpay: configOnlyTester("ECPay", ["merchantId", "hashKey", "hashIV"]),

  // --- email ---
  sendgrid: async (config) => {
    const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
      headers: { Authorization: `Bearer ${config.apiKey || ""}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "SendGrid API connection OK" };
    }
    throw new Error(`SendGrid returned ${res.status}`);
  },
  ses: configOnlyTester("Amazon SES", [
    "accessKeyId",
    "secretAccessKey",
    "region",
  ]),
  mailgun: async (config) => {
    if (!config.domain) throw new Error("Mailgun domain not configured");
    const credentials = Buffer.from(`api:${config.apiKey}`).toString("base64");
    const res = await fetch(`https://api.mailgun.net/v3/${config.domain}`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status < 500) {
      return { success: true, message: "Mailgun API connection OK" };
    }
    throw new Error(`Mailgun returned ${res.status}`);
  },

  // --- sms ---
  twilio: async (config) => {
    if (!config.accountSid)
      throw new Error("Twilio Account SID not configured");
    const credentials = Buffer.from(
      `${config.accountSid}:${config.authToken}`,
    ).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (res.ok) {
      return { success: true, message: "Twilio API connection OK" };
    }
    throw new Error(`Twilio returned ${res.status}`);
  },
  vonage: async (config) => {
    if (!config.apiKey || !config.apiSecret)
      throw new Error("Vonage API key/secret not configured");
    const res = await fetch(
      `https://rest.nexmo.com/account/get-balance?api_key=${config.apiKey}&api_secret=${config.apiSecret}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      return { success: true, message: "Vonage API connection OK" };
    }
    throw new Error(`Vonage returned ${res.status}`);
  },
  aws_sns: configOnlyTester("Amazon SNS", [
    "accessKeyId",
    "secretAccessKey",
    "region",
  ]),

  // --- auth ---
  auth0: async (config) => {
    if (!config.domain) throw new Error("Auth0 domain not configured");
    const domain = config.domain.startsWith("http")
      ? config.domain
      : `https://${config.domain}`;
    const res = await fetch(`${domain}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Auth0 connection OK" };
    }
    throw new Error(`Auth0 returned ${res.status}`);
  },
  firebase_auth: configOnlyTester("Firebase Auth", ["projectId", "apiKey"]),
  line_login: configOnlyTester("LINE Login", ["channelId", "channelSecret"]),

  // --- chat ---
  line_bot: async (config) => {
    if (!config.channelAccessToken)
      throw new Error("LINE Bot channel access token not configured");
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${config.channelAccessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "LINE Bot API connection OK" };
    }
    throw new Error(`LINE Bot API returned ${res.status}`);
  },
  whatsapp: async (config) => {
    if (!config.phoneNumberId || !config.accessToken)
      throw new Error("WhatsApp phone number ID and access token required");
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (res.ok) {
      return { success: true, message: "WhatsApp API connection OK" };
    }
    throw new Error(`WhatsApp API returned ${res.status}`);
  },
  discord: async (config) => {
    if (!config.botToken) throw new Error("Discord bot token not configured");
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${config.botToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Discord Bot API connection OK" };
    }
    throw new Error(`Discord API returned ${res.status}`);
  },
  telegram: async (config) => {
    if (!config.botToken)
      throw new Error("Telegram bot token not configured");
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/getMe`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      return { success: true, message: "Telegram Bot API connection OK" };
    }
    throw new Error(`Telegram API returned ${res.status}`);
  },

  // --- built-in ---
  built_in_real_estate: configOnlyTester("Built-in Real Estate", [
    "apiBaseUrl",
  ]),
  built_in_supabase: async (config, endpointUrl) => {
    const url = endpointUrl || config.projectUrl;
    if (!url)
      return {
        success: true,
        message: "Built-in Supabase configuration valid",
      };
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: config.apiKey || "",
        Authorization: `Bearer ${config.apiKey || ""}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 200) {
      return { success: true, message: "Built-in Supabase connection OK" };
    }
    throw new Error(`Built-in Supabase returned ${res.status}`);
  },

  // --- built-in industry (platform-managed, always available) ---
  built_in_restaurant: async () => ({
    success: true,
    message: "Built-in Restaurant service OK",
  }),
  built_in_medical: async () => ({
    success: true,
    message: "Built-in Medical service OK",
  }),
  built_in_beauty: async () => ({
    success: true,
    message: "Built-in Beauty service OK",
  }),
  built_in_education: async () => ({
    success: true,
    message: "Built-in Education service OK",
  }),
  built_in_realestate: async () => ({
    success: true,
    message: "Built-in Real Estate service OK",
  }),
  built_in_fitness: async () => ({
    success: true,
    message: "Built-in Fitness service OK",
  }),
  built_in_retail: async () => ({
    success: true,
    message: "Built-in Retail service OK",
  }),
  built_in_hospitality: async () => ({
    success: true,
    message: "Built-in Hospitality service OK",
  }),
  built_in_legal: async () => ({
    success: true,
    message: "Built-in Legal service OK",
  }),
  built_in_accounting: async () => ({
    success: true,
    message: "Built-in Accounting service OK",
  }),
  built_in_auto_repair: async () => ({
    success: true,
    message: "Built-in Auto Repair service OK",
  }),
  built_in_pet_care: async () => ({
    success: true,
    message: "Built-in Pet Care service OK",
  }),
  built_in_photography: async () => ({
    success: true,
    message: "Built-in Photography service OK",
  }),
  built_in_cleaning: async () => ({
    success: true,
    message: "Built-in Cleaning service OK",
  }),
  built_in_logistics: async () => ({
    success: true,
    message: "Built-in Logistics service OK",
  }),

  // --- platform ---
  supabase: async (config, endpointUrl) => {
    const url = endpointUrl || config.projectUrl;
    if (!url) throw new Error("Project URL not configured");
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: config.apiKey || "",
        Authorization: `Bearer ${config.apiKey || ""}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 200) {
      return { success: true, message: "Supabase connection OK" };
    }
    throw new Error(`Supabase returned ${res.status}`);
  },
  hasura: async (config, endpointUrl) => {
    const url = endpointUrl || config.endpointUrl;
    if (!url) throw new Error("Hasura endpoint URL not configured");
    const res = await fetch(`${url}/v1/metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.adminSecret
          ? { "x-hasura-admin-secret": config.adminSecret }
          : {}),
      },
      body: JSON.stringify({ type: "export_metadata", version: 2, args: {} }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Hasura connection OK" };
    }
    throw new Error(`Hasura returned ${res.status}`);
  },

  // --- ai_model ---
  openai: async (config) => {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${config.apiKey || ""}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "OpenAI API connection OK" };
    }
    throw new Error(`OpenAI returned ${res.status}`);
  },
  gemini: async (config) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey || ""}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      return { success: true, message: "Gemini API connection OK" };
    }
    throw new Error(`Gemini returned ${res.status}`);
  },
  claude: async (config) => {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Claude API connection OK" };
    }
    throw new Error(`Claude returned ${res.status}`);
  },
  openrouter: async (config) => {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${config.apiKey || ""}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "OpenRouter API connection OK" };
    }
    throw new Error(`OpenRouter returned ${res.status}`);
  },
};

// ---- Probe Functions ----

/** Row shape needed for probing — mirrors the Prisma Service model fields. */
export interface ServiceRow {
  id: string;
  type: ServiceType;
  configEncrypted: string;
  iv: string;
  authTag: string;
  endpointUrl: string | null;
}

/**
 * Probe a single service instance by decrypting its config and running
 * the appropriate tester.
 */
export async function probeServiceInstance(
  service: ServiceRow,
): Promise<ProbeResult> {
  const tester = testers[service.type];
  if (!tester) {
    return {
      serviceId: service.id,
      status: "untested",
      message: `No tester for type: ${service.type}`,
    };
  }

  try {
    const config = JSON.parse(
      decrypt(service.configEncrypted, service.iv, service.authTag),
    );
    const result = await tester(config, service.endpointUrl);
    return {
      serviceId: service.id,
      status: result.success ? "ok" : "failed",
      message: result.message,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return { serviceId: service.id, status: "failed", message: msg };
  }
}

/**
 * Probe all service instances in parallel with a global timeout.
 * Services that do not finish within `timeoutMs` are marked as "untested".
 */
export async function probeAllServices(
  services: ServiceRow[],
  timeoutMs: number = 8000,
): Promise<ProbeResult[]> {
  if (services.length === 0) return [];

  // Race each probe against the global timeout
  const deadline = AbortSignal.timeout(timeoutMs);

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      // If the global deadline has fired, bail out immediately
      if (deadline.aborted) {
        return {
          serviceId: svc.id,
          status: "untested" as const,
          message: "Probe timed out",
        };
      }

      // Wrap each probe in its own race against the deadline
      return Promise.race([
        probeServiceInstance(svc),
        new Promise<ProbeResult>((resolve) => {
          const onAbort = () =>
            resolve({
              serviceId: svc.id,
              status: "untested",
              message: "Probe timed out",
            });
          if (deadline.aborted) {
            onAbort();
          } else {
            deadline.addEventListener("abort", onAbort, { once: true });
          }
        }),
      ]);
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      serviceId: services[i].id,
      status: "failed" as const,
      message: r.reason instanceof Error ? r.reason.message : "Probe failed",
    };
  });
}
