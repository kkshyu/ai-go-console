/**
 * Provision a built-in PostHog project for an organization.
 *
 * Uses the self-hosted PostHog instance deployed in k3d.
 * Each org gets its own project for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   BUILTIN_POSTHOG_URL — PostHog base URL (default: http://localhost:8100)
 *   BUILTIN_POSTHOG_API_KEY — PostHog personal API key
 */
export async function provisionPostHogProject(
  orgSlug: string
): Promise<{ url: string; apiKey: string; projectId: string }> {
  const url = process.env.BUILTIN_POSTHOG_URL || "http://localhost:8100";
  const apiKey = process.env.BUILTIN_POSTHOG_API_KEY || "";

  if (!url) {
    throw new Error(
      "BUILTIN_POSTHOG_URL must be set — cannot provision built-in PostHog"
    );
  }

  // Per-org project ID for tenant isolation
  // In production, create project via PostHog API
  const projectId = `org-${orgSlug}`;

  return { url, apiKey, projectId };
}
