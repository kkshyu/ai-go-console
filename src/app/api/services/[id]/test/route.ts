import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { testers } from "@/lib/services/service-tester";

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
