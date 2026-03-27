import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;

  const deployments = await prisma.deployment.findMany({
    where: { appId },
    orderBy: { version: "desc" },
    take: 50,
  });

  return NextResponse.json(deployments);
}
