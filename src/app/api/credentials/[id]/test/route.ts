import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ds = await prisma.credential.findUnique({ where: { id } });
  if (!ds) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const credentials = JSON.parse(decrypt(ds.credentialsEncrypted, ds.iv, ds.authTag));

  try {
    switch (ds.type) {
      case "postgres":
      case "mysql": {
        // Attempt TCP connection to host:port
        const net = await import("node:net");
        const host = credentials.host || "localhost";
        const port = parseInt(credentials.port || (ds.type === "postgres" ? "5432" : "3306"), 10);

        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(5000);
          socket.on("connect", () => {
            socket.destroy();
            resolve();
          });
          socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Connection timeout"));
          });
          socket.on("error", (err) => reject(err));
          socket.connect(port, host);
        });

        return NextResponse.json({ success: true, message: `Connected to ${host}:${port}` });
      }

      case "supabase": {
        // Test Supabase project URL
        const url = credentials.projectUrl;
        if (!url) throw new Error("Project URL not configured");

        const res = await fetch(`${url}/rest/v1/`, {
          headers: {
            apikey: credentials.apiKey || "",
            Authorization: `Bearer ${credentials.apiKey || ""}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok || res.status === 200) {
          return NextResponse.json({ success: true, message: "Supabase connection OK" });
        }
        throw new Error(`Supabase returned ${res.status}`);
      }

      case "redis": {
        const net = await import("node:net");
        const host = credentials.host || "localhost";
        const port = parseInt(credentials.port || "6379", 10);

        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(5000);
          socket.on("connect", () => {
            socket.destroy();
            resolve();
          });
          socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Connection timeout"));
          });
          socket.on("error", (err) => reject(err));
          socket.connect(port, host);
        });

        return NextResponse.json({ success: true, message: `Connected to ${host}:${port}` });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported type: ${ds.type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ success: false, message: msg }, { status: 200 });
  }
}
