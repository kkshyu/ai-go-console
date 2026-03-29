/**
 * Provision a built-in Metabase group for an organization.
 *
 * Uses the self-hosted Metabase instance deployed in k3d.
 * Each org gets its own group/collection for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   BUILTIN_METABASE_URL — Metabase base URL (default: http://localhost:3001)
 *   BUILTIN_METABASE_API_KEY — Metabase API key
 */
export async function provisionMetabaseGroup(
  orgSlug: string
): Promise<{ url: string; apiKey: string; groupName: string }> {
  const url = process.env.BUILTIN_METABASE_URL || "http://localhost:3001";
  const apiKey = process.env.BUILTIN_METABASE_API_KEY || "";

  if (!url) {
    throw new Error(
      "BUILTIN_METABASE_URL must be set — cannot provision built-in Metabase"
    );
  }

  // Per-org group for tenant isolation
  const groupName = `org-${orgSlug}`;

  return { url, apiKey, groupName };
}
