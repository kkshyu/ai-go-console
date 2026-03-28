import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { verifyProxyToken } from "@/lib/proxy-token";
import { SERVICE_TYPE_HTTP_MODE, isIndustryServiceType } from "@/lib/service-types";
import {
  getDbDriver,
  getMongoDriver,
  isMongoType,
  type MongoOperation,
} from "@/lib/db-drivers";
import { dispatchIndustryRequest } from "@/lib/builtin-industry";
import type { ServiceType } from "@prisma/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;

  // Rate limit: 100 queries per service per minute
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`proxy:${serviceId}:${ip}`, 100, 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // Verify HMAC proxy token
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  try {
    if (!verifyProxyToken(serviceId, token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Load service
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Only proxy-type services are allowed
  const httpMode = SERVICE_TYPE_HTTP_MODE[service.type as ServiceType];
  if (httpMode !== "proxy") {
    return NextResponse.json(
      { error: `Service type "${service.type}" does not support proxy access` },
      { status: 400 }
    );
  }

  // Decrypt credentials
  const config = JSON.parse(
    decrypt(service.configEncrypted, service.iv, service.authTag)
  );

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Industry built-in services — each handles requests independently
    if (isIndustryServiceType(service.type as ServiceType)) {
      const result = dispatchIndustryRequest(service.type as ServiceType, body);
      return NextResponse.json(result.body, { status: result.status });
    }

    if (isMongoType(service.type as ServiceType)) {
      // MongoDB operation
      const op = body as unknown as MongoOperation;
      if (!op.database || !op.collection || !op.operation) {
        return NextResponse.json(
          { error: "MongoDB requires: database, collection, operation" },
          { status: 400 }
        );
      }
      const driver = getMongoDriver();
      const result = await driver.execute(config, op);
      return NextResponse.json({ success: true, data: result });
    } else {
      // SQL query (PostgreSQL, MySQL)
      const sql = body.sql as string | undefined;
      if (!sql) {
        return NextResponse.json({ error: "Missing 'sql' field" }, { status: 400 });
      }

      // Block destructive DDL statements to prevent accidental/malicious data loss
      const normalized = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim().toUpperCase();
      const destructivePatterns = [
        /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|TRIGGER|ROLE)\b/,
        /\bTRUNCATE\b/,
        /\bALTER\s+(TABLE|DATABASE|SCHEMA|ROLE)\b/,
        /\bCREATE\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|TRIGGER|ROLE)\b/,
        /\bGRANT\b/,
        /\bREVOKE\b/,
      ];
      if (destructivePatterns.some((p) => p.test(normalized))) {
        return NextResponse.json(
          { error: "DDL statements are not allowed through the proxy" },
          { status: 403 }
        );
      }

      const queryParams = (body.params as unknown[]) || [];
      const driver = getDbDriver(service.type as ServiceType);
      const result = await driver.query(config, sql, queryParams);
      return NextResponse.json({ success: true, data: result });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query execution failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
