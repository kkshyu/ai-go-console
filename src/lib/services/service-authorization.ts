/**
 * Service Authorization & Binding Service
 *
 * Extracted from PM Actor. Handles RBAC validation and binding
 * services to apps based on agent output.
 */

import { prisma } from "../db";

export interface ServiceSpec {
  instanceId: string;
  name: string;
  type: string;
}

export interface BindResult {
  bound: number;
  names: string[];
  unauthorized?: string[];
}

/**
 * Extract service specifications from agent output content.
 */
export function extractServicesFromContent(content: string): ServiceSpec[] {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[1]);

    if (parsed.action === "architect_design" && parsed.design?.services) {
      return parsed.design.services;
    }
    if (parsed.requiredServices) {
      return parsed.requiredServices;
    }
  } catch {
    // Invalid JSON
  }

  return [];
}

/**
 * Get the set of service IDs authorized for a user.
 * Only returns IDs of services that are both authorized AND verified working
 * (i.e., present in the probed serviceInstances list which only contains status: "ok").
 */
export async function getAuthorizedServiceIds(
  userId: string | undefined,
  serviceInstances: Array<{ id: string }>,
): Promise<Set<string>> {
  if (!userId) {
    // Fallback: trust the pre-filtered instances list
    return new Set(serviceInstances.map((s) => s.id));
  }

  // serviceInstances already contains only probe-passed ("ok") instances.
  // Intersect with the user's authorization.
  const okIds = new Set(serviceInstances.map((s) => s.id));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, organizationId: true },
  });

  if (user?.role === "admin") {
    // Admin can use all org services, but still limited to probe-passed ones
    const orgServices = await prisma.service.findMany({
      where: { organizationId: user.organizationId! },
      select: { id: true },
    });
    const adminIds = new Set<string>();
    for (const s of orgServices) {
      if (okIds.has(s.id)) adminIds.add(s.id);
    }
    return adminIds;
  }

  // Non-admin: intersect userAllowedServiceInstance with probe-passed
  const allowed = await prisma.userAllowedServiceInstance.findMany({
    where: { userId },
    select: { serviceId: true },
  });
  const authorizedIds = new Set<string>();
  for (const a of allowed) {
    if (okIds.has(a.serviceId)) authorizedIds.add(a.serviceId);
  }
  return authorizedIds;
}

/**
 * Validate and bind services to an app.
 * Returns the bind result including any unauthorized services.
 */
export async function bindServicesToApp(
  appId: string,
  services: ServiceSpec[],
  authorizedServiceIds: Set<string>,
): Promise<BindResult> {
  if (services.length === 0) {
    return { bound: 0, names: [] };
  }

  const serviceIds = services.map((s) => s.instanceId).filter(Boolean);
  if (serviceIds.length === 0) {
    return { bound: 0, names: [] };
  }

  // Check for unauthorized services
  const unauthorized = services.filter(
    (s) => s.instanceId && !authorizedServiceIds.has(s.instanceId),
  );
  if (unauthorized.length > 0) {
    return {
      bound: 0,
      names: [],
      unauthorized: unauthorized.map((s) => `${s.name} (${s.type})`),
    };
  }

  // Skip already-bound services
  const existingBindings = await prisma.appService.findMany({
    where: { appId },
    select: { serviceId: true },
  });
  const existingIds = new Set(existingBindings.map((b) => b.serviceId));
  const newServiceIds = serviceIds.filter((id) => !existingIds.has(id));

  if (newServiceIds.length === 0) {
    return { bound: 0, names: [] };
  }

  await prisma.appService.createMany({
    data: newServiceIds.map((svcId, index) => ({
      appId,
      serviceId: svcId,
      envVarPrefix:
        existingBindings.length + index === 0
          ? "SVC"
          : `SVC${existingBindings.length + index}`,
    })),
    skipDuplicates: true,
  });

  const boundNames = services
    .filter((s) => newServiceIds.includes(s.instanceId))
    .map((s) => s.name);

  return { bound: newServiceIds.length, names: boundNames };
}
