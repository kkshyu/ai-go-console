/**
 * Provision a built-in Qdrant collection for an organization.
 *
 * Uses the self-hosted Qdrant instance deployed in k3d.
 * Each org gets its own collection prefix for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   BUILTIN_QDRANT_URL — Qdrant HTTP API URL (default: http://localhost:6333)
 *   BUILTIN_QDRANT_API_KEY — Qdrant API key (optional in dev)
 */
export async function provisionQdrantCollection(
  orgSlug: string
): Promise<{ url: string; apiKey: string; collectionPrefix: string }> {
  const url = process.env.BUILTIN_QDRANT_URL || "http://localhost:6333";
  const apiKey = process.env.BUILTIN_QDRANT_API_KEY || "";

  if (!url) {
    throw new Error(
      "BUILTIN_QDRANT_URL must be set — cannot provision built-in Qdrant"
    );
  }

  // Per-org collection prefix for tenant isolation
  const collectionPrefix = `org_${orgSlug.replace(/-/g, "_")}`;

  return { url, apiKey, collectionPrefix };
}
