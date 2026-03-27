import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getDbDriver, getMongoDriver } from "@/lib/db-drivers";
import type { ServiceType } from "@prisma/client";

interface TestResult {
  success: boolean;
  message: string;
}

type ServiceTester = (
  config: Record<string, string>,
  endpointUrl: string | null
) => Promise<TestResult>;

/**
 * Test by hitting a generic HTTP endpoint.
 */
function httpEndpointTester(label: string, authHeader?: (config: Record<string, string>) => Record<string, string>): ServiceTester {
  return async (config, endpointUrl) => {
    const url = endpointUrl || config.endpointUrl;
    if (!url) throw new Error(`${label} endpoint URL not configured`);

    const headers = authHeader ? authHeader(config) : {};
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok || res.status < 500) {
      return { success: true, message: `${label} endpoint reachable (${res.status})` };
    }
    throw new Error(`${label} endpoint returned ${res.status}`);
  };
}

/**
 * Config-only validation (no network call).
 */
function configOnlyTester(label: string, requiredFields: string[]): ServiceTester {
  return async (config) => {
    const missing = requiredFields.filter((f) => !config[f]);
    if (missing.length > 0) {
      return { success: false, message: `${label}: missing fields: ${missing.join(", ")}` };
    }
    return { success: true, message: `${label} configuration valid` };
  };
}

const testers: Record<ServiceType, ServiceTester> = {
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
      headers: config.accessKeyId && config.secretAccessKey
        ? { Authorization: `AWS ${config.accessKeyId}:${config.secretAccessKey}` }
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
  azure_blob: configOnlyTester("Azure Blob Storage", ["accountName", "accountKey", "containerName"]),

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
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
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
  ses: configOnlyTester("Amazon SES", ["accessKeyId", "secretAccessKey", "region"]),
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
    if (!config.accountSid) throw new Error("Twilio Account SID not configured");
    const credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      return { success: true, message: "Twilio API connection OK" };
    }
    throw new Error(`Twilio returned ${res.status}`);
  },
  vonage: async (config) => {
    if (!config.apiKey || !config.apiSecret) throw new Error("Vonage API key/secret not configured");
    const res = await fetch(
      `https://rest.nexmo.com/account/get-balance?api_key=${config.apiKey}&api_secret=${config.apiSecret}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      return { success: true, message: "Vonage API connection OK" };
    }
    throw new Error(`Vonage returned ${res.status}`);
  },
  aws_sns: configOnlyTester("Amazon SNS", ["accessKeyId", "secretAccessKey", "region"]),

  // --- auth ---
  auth0: async (config) => {
    if (!config.domain) throw new Error("Auth0 domain not configured");
    const domain = config.domain.startsWith("http") ? config.domain : `https://${config.domain}`;
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
    if (!config.channelAccessToken) throw new Error("LINE Bot channel access token not configured");
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
    if (!config.phoneNumberId || !config.accessToken) throw new Error("WhatsApp phone number ID and access token required");
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        signal: AbortSignal.timeout(5000),
      }
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
    if (!config.botToken) throw new Error("Telegram bot token not configured");
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Telegram Bot API connection OK" };
    }
    throw new Error(`Telegram API returned ${res.status}`);
  },

  // --- built-in ---
  built_in_pg: async (config) => {
    const driver = getDbDriver("built_in_pg");
    await driver.testConnection(config);
    return { success: true, message: "Built-in PostgreSQL connection OK" };
  },
  built_in_disk: configOnlyTester("Built-in Disk Storage", ["basePath"]),

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
        ...(config.adminSecret ? { "x-hasura-admin-secret": config.adminSecret } : {}),
      },
      body: JSON.stringify({ type: "export_metadata", version: 2, args: {} }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return { success: true, message: "Hasura connection OK" };
    }
    throw new Error(`Hasura returned ${res.status}`);
  },
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (organizationId && service.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = JSON.parse(decrypt(service.configEncrypted, service.iv, service.authTag));
  const tester = testers[service.type];

  if (!tester) {
    return NextResponse.json(
      { error: `Unsupported type: ${service.type}` },
      { status: 400 }
    );
  }

  try {
    const result = await tester(config, service.endpointUrl);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, message: msg }, { status: 200 });
  }
}
