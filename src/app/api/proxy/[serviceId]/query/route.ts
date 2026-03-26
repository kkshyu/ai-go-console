import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { verifyProxyToken } from "@/lib/proxy-token";
import { SERVICE_TYPE_HTTP_MODE } from "@/lib/service-types";
import {
  getDbDriver,
  getMongoDriver,
  isMongoType,
  type MongoOperation,
} from "@/lib/db-drivers";
import type { ServiceType } from "@prisma/client";

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
