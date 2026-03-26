import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

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
  const endpointUrl = service.endpointUrl;

  try {
    switch (service.type) {
      case "postgresql": {
        // Test via HTTP endpoint (e.g., PostgREST, Supabase REST)
        const url = endpointUrl || config.endpointUrl;
        if (!url) throw new Error("HTTP endpoint URL not configured");

        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok || res.status < 500) {
          return NextResponse.json({ success: true, message: `PostgreSQL HTTP endpoint reachable (${res.status})` });
        }
        throw new Error(`HTTP endpoint returned ${res.status}`);
      }

      case "supabase": {
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
          return NextResponse.json({ success: true, message: "Supabase connection OK" });
        }
        throw new Error(`Supabase returned ${res.status}`);
      }

      case "disk": {
        const url = endpointUrl || config.endpointUrl;
        if (!url) throw new Error("Disk storage endpoint URL not configured");

        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok || res.status < 500) {
          return NextResponse.json({ success: true, message: "Disk storage endpoint reachable" });
        }
        throw new Error(`Disk endpoint returned ${res.status}`);
      }

      case "stripe": {
        const url = endpointUrl || "https://api.stripe.com/v1/balance";
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey || ""}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          return NextResponse.json({ success: true, message: "Stripe API connection OK" });
        }
        throw new Error(`Stripe returned ${res.status}`);
      }

      case "hasura": {
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
          body: JSON.stringify({
            type: "export_metadata",
            version: 2,
            args: {},
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          return NextResponse.json({ success: true, message: "Hasura connection OK" });
        }
        throw new Error(`Hasura returned ${res.status}`);
      }

      default:
        return NextResponse.json(
          { error: `Unsupported type: ${service.type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, message: msg }, { status: 200 });
  }
}
