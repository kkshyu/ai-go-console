import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;
  const { orgId } = await params;

  if (!organizationId || organizationId !== orgId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const configs = await prisma.agentModelConfig.findMany({
    where: { organizationId: orgId },
  });

  return NextResponse.json(configs);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;
  const { orgId } = await params;

  if (!organizationId || organizationId !== orgId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { configs } = body as {
    configs: { agentRole: string; modelId: string }[];
  };

  if (!Array.isArray(configs)) {
    return NextResponse.json({ error: "configs array required" }, { status: 400 });
  }

  const results = await prisma.$transaction(
    configs.map((c) =>
      prisma.agentModelConfig.upsert({
        where: {
          organizationId_agentRole: {
            organizationId: orgId,
            agentRole: c.agentRole,
          },
        },
        update: { modelId: c.modelId },
        create: {
          organizationId: orgId,
          agentRole: c.agentRole,
          modelId: c.modelId,
        },
      })
    )
  );

  return NextResponse.json(results);
}
