import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeAppAccess } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  const { appId } = await params;
  const auth = await authorizeAppAccess(appId);
  if ("error" in auth) return auth.error;

  const deployments = await prisma.deployment.findMany({
    where: { appId },
    orderBy: { version: "desc" },
    take: 50,
  });

  return NextResponse.json(deployments);
}
