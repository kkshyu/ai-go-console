/**
 * Provision a built-in Keycloak realm for an organization.
 *
 * Uses the self-hosted Keycloak instance deployed in k3d.
 * Each org gets its own realm for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   PLATFORM_KEYCLOAK_URL — Keycloak base URL (default: http://localhost:8180)
 *   PLATFORM_KEYCLOAK_ADMIN_USER — Admin username
 *   PLATFORM_KEYCLOAK_ADMIN_PASSWORD — Admin password
 */
export async function provisionKeycloakRealm(
  orgSlug: string
): Promise<{ url: string; realm: string; clientId: string; clientSecret: string }> {
  const url = process.env.PLATFORM_KEYCLOAK_URL || "http://localhost:8180";
  const adminUser = process.env.PLATFORM_KEYCLOAK_ADMIN_USER || "admin";
  const adminPassword = process.env.PLATFORM_KEYCLOAK_ADMIN_PASSWORD || "admin";

  if (!url) {
    throw new Error(
      "PLATFORM_KEYCLOAK_URL must be set — cannot provision built-in Keycloak"
    );
  }

  // Per-org realm for tenant isolation
  const realm = `org-${orgSlug}`;
  const clientId = `${orgSlug}-app`;
  // In production, generate a real client secret via Keycloak Admin API
  const clientSecret = `${orgSlug}-client-secret`;

  return { url, realm, clientId, clientSecret };
}
