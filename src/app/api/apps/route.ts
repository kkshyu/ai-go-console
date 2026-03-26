import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { generateApp } from "@/lib/generator";

export async function GET() {
  const apps = await prisma.app.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      domains: true,
      credentials: {
        include: {
          credential: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  });

  return NextResponse.json(apps);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, template, config, credentialIds, userId } = body;

  if (!name || !template || !userId) {
    return NextResponse.json(
      { error: "Name, template, and userId are required" },
      { status: 400 }
    );
  }

  let slug = slugify(name);

  // Ensure unique slug
  const existing = await prisma.app.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Find next available port
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
      userId,
      credentials: credentialIds
        ? {
            create: credentialIds.map(
              (credId: string, index: number) => ({
                credentialId: credId,
                envVarPrefix: index === 0 ? "DB" : `DS${index}`,
              })
            ),
          }
        : undefined,
    },
  });

  // Generate app files from template
  try {
    await generateApp({
      slug,
      name,
      description,
      template,
      port,
      credentialIds,
    });
  } catch (error) {
    // Clean up DB record on generation failure
    await prisma.app.delete({ where: { id: app.id } });
    const msg = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(app, { status: 201 });
}
