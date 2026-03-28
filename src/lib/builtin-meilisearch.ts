/**
 * Provision a built-in Meilisearch index for an organization.
 *
 * Uses the self-hosted Meilisearch instance deployed in k3d.
 * Each org gets its own index prefix for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   PLATFORM_MEILISEARCH_URL — Meilisearch HTTP URL (default: http://localhost:7700)
 *   PLATFORM_MEILISEARCH_API_KEY — Master API key
 */
export async function provisionMeilisearchIndex(
  orgSlug: string
): Promise<{ url: string; apiKey: string; indexPrefix: string }> {
  const url = process.env.PLATFORM_MEILISEARCH_URL || "http://localhost:7700";
  const apiKey = process.env.PLATFORM_MEILISEARCH_API_KEY || "";

  if (!url) {
    throw new Error(
      "PLATFORM_MEILISEARCH_URL must be set — cannot provision built-in Meilisearch"
    );
  }

  // Per-org index prefix for tenant isolation
  const indexPrefix = `org_${orgSlug.replace(/-/g, "_")}`;

  return { url, apiKey, indexPrefix };
}
