import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { generateApp } from "@/lib/generator";

export async function GET() {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  // Scope to org: show apps from users in the same org
  const where = organizationId
    ? { user: { organizationId } }
    : {};

  const apps = await prisma.app.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      services: {
        include: {
          service: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  });

  return NextResponse.json(apps);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  const body = await request.json();
  const { name, description, template, config, serviceIds, userId, files, npmPackages } = body;

  if (!name || !template) {
    return NextResponse.json(
      { error: "Name and template are required" },
      { status: 400 }
    );
  }

  // Resolve userId: use provided one if valid, otherwise fallback to first admin
  let resolvedUserId = userId;
  if (resolvedUserId) {
    const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
    if (!user) resolvedUserId = null;
  }
  if (!resolvedUserId) {
    const admin = await prisma.user.findFirst({
      where: { role: "admin", ...(organizationId ? { organizationId } : {}) },
    });
    if (!admin) {
      return NextResponse.json(
        { error: "No admin user found. Please register first." },
        { status: 400 }
      );
    }
    resolvedUserId = admin.id;
  }

  // Validate service IDs belong to the same org and their types are allowed
  if (serviceIds && serviceIds.length > 0 && organizationId) {
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, organizationId },
    });
    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "Some services not found or not in your organization" },
        { status: 400 }
      );
    }

    // Check each service type is allowed
    const allowedServices = await prisma.orgAllowedService.findMany({
      where: { organizationId, enabled: true },
    });
    const allowedTypes = new Set(allowedServices.map((s) => s.serviceType));

    for (const svc of services) {
      if (!allowedTypes.has(svc.type)) {
        return NextResponse.json(
          { error: `Service type "${svc.type}" is not enabled for your organization` },
          { status: 403 }
        );
      }
    }
  }

  let slug = slugify(name);
  const existing = await prisma.app.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const lastApp = await prisma.app.findFirst({
    where: { port: { not: null } },
    orderBy: { port: "desc" },
  });
  const port = (lastApp?.port ?? 3099) + 1;

  const app = await prisma.app.create({
    data: {
      name,
      slug,
      description,
      template,
      port,
      config: config || {},
      userId: resolvedUserId,
      services: serviceIds
        ? {
            create: serviceIds.map(
              (svcId: string, index: number) => ({
                serviceId: svcId,
                envVarPrefix: index === 0 ? "SVC" : `SVC${index}`,
              })
            ),
          }
        : undefined,
    },
  });

  try {
    await generateApp({
      slug,
      name,
      description,
      template,
      port,
      serviceIds,
      files,
      npmPackages,
    });
  } catch (error) {
    await prisma.app.delete({ where: { id: app.id } });
    const msg = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(app, { status: 201 });
}
