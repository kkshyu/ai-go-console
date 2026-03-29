import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllDefaults } from "@/lib/model-tiers";

const ALL_AGENT_ROLES = [
  "pm", "architect", "developer", "reviewer", "devops",
  "ux_designer", "tester", "db_migrator", "doc_writer",
];

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

  const defaults = getAllDefaults(ALL_AGENT_ROLES);

  return NextResponse.json({ configs, defaults });
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

  // Get defaults to filter out unchanged entries
  const defaults = getAllDefaults(ALL_AGENT_ROLES);

  // Only save configs that differ from the effective default
  const toSave = configs.filter((c) => c.modelId !== defaults[c.agentRole]);

  // Delete configs that match defaults (user reset to default)
  const toDelete = configs
    .filter((c) => c.modelId === defaults[c.agentRole])
    .map((c) => c.agentRole);

  await prisma.$transaction([
    // Delete entries that match defaults
    ...(toDelete.length > 0
      ? [prisma.agentModelConfig.deleteMany({
          where: {
            organizationId: orgId,
            agentRole: { in: toDelete },
          },
        })]
      : []),
    // Upsert entries that differ from defaults
    ...toSave.map((c) =>
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
    ),
  ]);

  // Return updated state
  const updatedConfigs = await prisma.agentModelConfig.findMany({
    where: { organizationId: orgId },
  });

  return NextResponse.json({ configs: updatedConfigs, defaults });
}
