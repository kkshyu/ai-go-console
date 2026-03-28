/**
 * Multi-Agent Service Layer
 *
 * Extracts all database queries and data preparation logic from the
 * multi-agent API route, creating a clean boundary between the HTTP
 * layer (Next.js) and the agent orchestration logic.
 *
 * This service can be consumed by any transport layer (Next.js route,
 * standalone HTTP server, gRPC, etc.) without modification.
 */

import { prisma, getOrgSlug } from "@/lib/db";
import { buildAppContextPrompt, type ChatMessage } from "@/lib/ai";
import { buildFileTreeContext } from "@/lib/file-context";
import type { AgentRole, AgentMessage } from "@/lib/agents/types";

// ---- Public Types (the agent service contract) ----

/** Input required to start a multi-agent session */
export interface MultiAgentRequest {
  messages: ChatMessage[];
  model?: string;
  appId?: string;
  conversationId?: string;
  locale: string;
  userId?: string;
  userRole?: string;
  organizationId?: string;
}

/** Resolved context the actor system needs to run */
export interface MultiAgentContext {
  conversationId: string;
  locale: string;
  allowedServices: string[];
  serviceInstances: ServiceInstance[];
  appContext?: string;
  appSlug?: string;
  appOrgSlug?: string;
  artifactContext: string;
  fileContext?: string;
  agentMessages: AgentMessage[];
  pmPrompt: string;
  model?: string;
  appId?: string;
  userId?: string;
}

export interface ServiceInstance {
  id: string;
  name: string;
  type: string;
  status: "ok" | "failed" | "untested";
  message?: string;
}

// ---- Data Access Functions ----

/**
 * Load allowed services and service instances for an organization.
 */
export async function loadOrgServices(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<{ allowedServices: string[]; serviceInstances: ServiceInstance[] }> {
  const orgAllowed = await prisma.orgAllowedService.findMany({
    where: { organizationId, enabled: true },
  });
  const allowedServices = orgAllowed.map((s) => s.serviceType);

  let serviceInstances: ServiceInstance[];
  if (userRole === "admin") {
    const services = await prisma.service.findMany({
      where: { organizationId },
      select: { id: true, name: true, type: true },
    });
    serviceInstances = services.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: "untested" as const,
    }));
  } else {
    const allowed = await prisma.userAllowedServiceInstance.findMany({
      where: { userId },
      include: {
        service: { select: { id: true, name: true, type: true } },
      },
    });
    serviceInstances = allowed.map((a) => ({
      id: a.service.id,
      name: a.service.name,
      type: a.service.type,
      status: "untested" as const,
    }));
  }

  return { allowedServices, serviceInstances };
}

/**
 * Load app context including bound services and file tree.
 */
export async function loadAppContext(
  appId: string,
  allowedServices: string[],
): Promise<{
  appContext: string;
  appSlug: string;
  appOrgSlug: string;
} | null> {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      services: {
        include: {
          service: { select: { name: true, type: true } },
        },
      },
    },
  });
  if (!app) return null;

  const appOrgSlug = await getOrgSlug(app.userId);
  const fileContext = await buildFileTreeContext(appOrgSlug, app.slug);
  const appContext = buildAppContextPrompt(
    {
      name: app.name,
      template: app.template,
      description: app.description,
      status: app.status,
      port: app.port,
      services: app.services.map((s) => ({
        name: s.service.name,
        type: s.service.type,
      })),
    },
    allowedServices,
    fileContext,
  );

  return { appContext, appSlug: app.slug, appOrgSlug };
}

/**
 * Load artifact context using RAG (vector similarity search) when available,
 * falling back to full concatenation with truncation.
 */
export async function loadArtifactContext(
  conversationId: string,
  queryText?: string,
  maxChars: number = 8000,
): Promise<string> {
  // Try RAG approach if query text is provided
  if (queryText) {
    try {
      const { backgroundSystem } = await import(
        "@/lib/actors/background-system"
      );
      if (backgroundSystem.initialized) {
        const result = await backgroundSystem.request<{
          context: string;
          chunks: Array<{
            content: string;
            similarity: number;
            agentRole: string;
          }>;
        }>(
          "retrieval",
          "retrieve_request",
          { conversationId, query: queryText, maxChars },
          10_000, // 10s timeout
        );

        if (result.context && result.chunks.length > 0) {
          return result.context;
        }
      }
    } catch (err) {
      console.warn(
        `[loadArtifactContext] RAG failed, falling back: ${err}`,
      );
    }
  }

  // Fallback: original concatenation approach with truncation
  const artifacts = await prisma.agentArtifact.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { agentRole: true, type: true, content: true },
  });

  if (artifacts.length === 0) return "";

  let context = "\n\nArtifacts from this conversation:\n";
  let charCount = context.length;

  for (const a of artifacts) {
    const entry = `[${a.agentRole.toUpperCase()} ${a.type}]: ${JSON.stringify(a.content)}\n`;
    if (charCount + entry.length > maxChars) break;
    context += entry;
    charCount += entry.length;
  }

  return context;
}

/**
 * Load file context from attached chat files.
 */
export async function loadFileContext(
  fileIds: string[],
  userId: string,
): Promise<string> {
  if (fileIds.length === 0) return "";

  const chatFiles = await prisma.chatFile.findMany({
    where: {
      id: { in: fileIds },
      userId,
    },
    select: {
      fileName: true,
      fileType: true,
      extractedText: true,
      summary: true,
      status: true,
    },
  });

  if (chatFiles.length === 0) return "";

  const fileParts = chatFiles.map((f) => {
    const content = f.summary || f.extractedText;
    if (!content) return `[File: ${f.fileName} — processing]`;
    return `--- File: ${f.fileName} ---\n${content}\n--- End of ${f.fileName} ---`;
  });

  return `\n\n[Attached Files]\n${fileParts.join("\n\n")}`;
}

/**
 * Save an agent's structured output as an artifact.
 */
export async function saveArtifact(
  conversationId: string,
  agentRole: AgentRole,
  content: string,
  options?: {
    actorId?: string;
    taskId?: string;
    appId?: string;
  },
): Promise<void> {
  const type = getArtifactType(content);
  if (!type) return;
  const jsonContent = extractJsonContent(content);
  if (!jsonContent) return;

  const artifact = await prisma.agentArtifact.create({
    data: {
      conversationId,
      agentRole,
      type,
      content: jsonContent as object,
      ...(options?.actorId && { actorId: options.actorId }),
      ...(options?.taskId && { taskId: options.taskId }),
      ...(options?.appId && { appId: options.appId }),
    },
  });

  // Fire-and-forget: generate embeddings for this artifact in the background
  try {
    const { backgroundSystem } = await import(
      "@/lib/actors/background-system"
    );
    if (backgroundSystem.initialized) {
      backgroundSystem.fireAndForget("embedding", "embed_request", {
        sourceType: "artifact",
        sourceId: artifact.id,
        conversationId,
        agentRole,
        content,
      });
    }
  } catch {
    // Embedding is optional — don't fail the save
  }
}

// ---- Resolve Full Context ----

/**
 * Resolve all database dependencies into a self-contained MultiAgentContext.
 * This is the single entry point that the API route (or any future transport)
 * should call before handing off to the actor system.
 */
export async function resolveMultiAgentContext(
  req: MultiAgentRequest,
): Promise<MultiAgentContext> {
  const { buildPMPrompt, buildAppDevPMPrompt } = await import(
    "@/lib/agents/prompts"
  );

  const conversationId =
    req.conversationId ||
    `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 1. Load org services
  let allowedServices: string[] = [];
  let serviceInstances: ServiceInstance[] = [];
  if (req.organizationId && req.userId && req.userRole) {
    const result = await loadOrgServices(
      req.organizationId,
      req.userId,
      req.userRole,
    );
    allowedServices = result.allowedServices;
    serviceInstances = result.serviceInstances;
  }

  // 2. Load app context
  let appContext: string | undefined;
  let appSlug: string | undefined;
  let appOrgSlug: string | undefined;
  if (req.appId) {
    const result = await loadAppContext(req.appId, allowedServices);
    if (result) {
      appContext = result.appContext;
      appSlug = result.appSlug;
      appOrgSlug = result.appOrgSlug;
    }
  }

  // 3. Convert messages
  const agentMessages: AgentMessage[] = req.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content:
      typeof m.content === "string"
        ? m.content
        : m.content
            .map((p) => (p.type === "text" ? p.text : `[image]`))
            .join("\n"),
    agentRole: (m as unknown as { agentRole?: string }).agentRole as
      | AgentMessage["agentRole"]
      | undefined,
    fileIds: (m as unknown as { fileIds?: string[] }).fileIds,
  }));

  // 4. Load artifact context (RAG)
  const lastUserMsg = req.messages.filter((m) => m.role === "user").pop();
  const lastUserMessage =
    (typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "") || "";
  const artifactContext = await loadArtifactContext(
    conversationId,
    lastUserMessage,
  );

  // 5. Load file context
  const allFileIds = req.messages.flatMap(
    (m) => (m as { fileIds?: string[] }).fileIds || [],
  );
  let fileContext: string | undefined;
  if (allFileIds.length > 0 && req.userId) {
    const fc = await loadFileContext(allFileIds, req.userId);
    if (fc) fileContext = fc;
  }

  // 6. Build PM prompt
  const pmPrompt = appContext
    ? buildAppDevPMPrompt(appContext)
    : buildPMPrompt(allowedServices);

  return {
    conversationId,
    locale: req.locale,
    allowedServices,
    serviceInstances,
    appContext,
    appSlug,
    appOrgSlug,
    artifactContext,
    fileContext,
    agentMessages,
    pmPrompt,
    model: req.model,
    appId: req.appId,
    userId: req.userId,
  };
}

// ---- Service Probing ----

/**
 * Probe all service instances for connectivity and return enriched instances
 * with status ("ok" | "failed" | "untested").
 *
 * Loads encrypted config from DB, runs testers in parallel, and optionally
 * emits SSE progress events via `sendEvent`.
 */
export async function probeAndEnrichServices(
  serviceInstances: ServiceInstance[],
  organizationId?: string,
  sendEvent?: (data: unknown) => Promise<void>,
): Promise<ServiceInstance[]> {
  if (serviceInstances.length === 0 || !organizationId) {
    return serviceInstances;
  }

  const { probeAllServices } = await import("@/lib/services/service-tester");
  const serviceIds = serviceInstances.map((s) => s.id);

  // Load encrypted config for probing
  const serviceRows = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: {
      id: true,
      type: true,
      configEncrypted: true,
      iv: true,
      authTag: true,
      endpointUrl: true,
    },
  });

  // Emit probe-start event
  if (sendEvent) {
    await sendEvent({
      serviceProbeStart: {
        total: serviceRows.length,
        services: serviceInstances.map((s) => ({ id: s.id, name: s.name, type: s.type })),
      },
    });
  }

  // Run all probes in parallel (8-second global timeout)
  const probeResults = await probeAllServices(serviceRows, 8000);

  // Build a lookup map from probe results
  const probeMap = new Map(probeResults.map((r) => [r.serviceId, r]));

  // Merge probe results into service instances
  const enriched = serviceInstances.map((svc) => {
    const probe = probeMap.get(svc.id);
    return {
      ...svc,
      status: probe?.status ?? ("untested" as const),
      message: probe?.message,
    };
  });

  // Emit probe-complete event
  if (sendEvent) {
    const summary = {
      total: enriched.length,
      ok: enriched.filter((s) => s.status === "ok").length,
      failed: enriched.filter((s) => s.status === "failed").length,
      untested: enriched.filter((s) => s.status === "untested").length,
      results: enriched.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        message: s.message,
      })),
    };
    await sendEvent({ serviceProbeComplete: summary });
  }

  return enriched;
}

// ---- Private Helpers ----

function getArtifactType(content: string): string | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const actionMap: Record<string, string> = {
      pm_spec: "spec",
      pm_analysis: "spec",
      architect_design: "design",
      create_app: "implementation",
      update_app: "implementation",
      modify_files: "implementation",
      review_result: "review",
      deploy_ready: "deployment",
      dispatch: "task",
      dispatch_parallel: "task",
      respond: null as unknown as string,
      complete: null as unknown as string,
    };
    return actionMap[parsed.action] ?? null;
  } catch {
    return null;
  }
}

function extractJsonContent(content: string): unknown | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}
