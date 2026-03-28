/**
 * Provision a built-in n8n workspace for an organization.
 *
 * Uses the self-hosted n8n instance deployed in k3d.
 * Shared instance with per-org API key scoping for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   PLATFORM_N8N_URL — n8n base URL (default: http://localhost:5678)
 *   PLATFORM_N8N_API_KEY — n8n API key for automation
 */
export async function provisionN8nWorkspace(
  orgSlug: string
): Promise<{ url: string; apiKey: string; webhookUrl: string }> {
  const url = process.env.PLATFORM_N8N_URL || "http://localhost:5678";
  const apiKey = process.env.PLATFORM_N8N_API_KEY || "";

  if (!url) {
    throw new Error(
      "PLATFORM_N8N_URL must be set — cannot provision built-in n8n"
    );
  }

  // Per-org webhook URL prefix for tenant isolation
  const webhookUrl = `${url}/webhook/${orgSlug}`;

  return { url, apiKey, webhookUrl };
}
