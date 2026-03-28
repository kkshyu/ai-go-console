import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTraefikAvailable, getLocalDomain } from "@/lib/k8s/ingress";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { slug: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const available = await isTraefikAvailable();
  const prodDomain = getLocalDomain(org.slug, "production");
  const devDomain = getLocalDomain(org.slug, "development");

  return NextResponse.json({
    available,
    mode: "traefik",
    localDomain: prodDomain,
    localUrl: `https://${prodDomain}`,
    devDomain,
    devUrl: `https://${devDomain}`,
  });
}
