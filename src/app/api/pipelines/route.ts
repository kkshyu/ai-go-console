import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { appId } = body as { appId?: string };

  const pipeline = await prisma.agentPipeline.create({
    data: {
      status: "idle",
      currentAgent: null,
      completedAgents: [],
      tasks: [],
      ...(appId ? { appId } : {}),
    },
  });

  return new Response(JSON.stringify(pipeline), {
    headers: { "Content-Type": "application/json" },
  });
}
