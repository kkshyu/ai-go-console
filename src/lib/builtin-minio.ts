/**
 * Provision a built-in MinIO bucket for an organization.
 *
 * Uses the self-hosted MinIO instance deployed in k3d.
 * Each org gets its own bucket prefix for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   PLATFORM_MINIO_URL — MinIO API endpoint (default: http://localhost:9000)
 *   PLATFORM_MINIO_ROOT_USER — Root username
 *   PLATFORM_MINIO_ROOT_PASSWORD — Root password
 */
export async function provisionMinioBucket(
  orgSlug: string
): Promise<{ endpoint: string; accessKey: string; secretKey: string; bucket: string }> {
  const endpoint = process.env.PLATFORM_MINIO_URL || "http://localhost:9000";
  const accessKey = process.env.PLATFORM_MINIO_ROOT_USER || "minioadmin";
  const secretKey = process.env.PLATFORM_MINIO_ROOT_PASSWORD || "minioadmin";

  if (!endpoint) {
    throw new Error(
      "PLATFORM_MINIO_URL must be set — cannot provision built-in MinIO"
    );
  }

  // Per-org bucket for tenant isolation
  const bucket = `org-${orgSlug}`;

  return { endpoint, accessKey, secretKey, bucket };
}
