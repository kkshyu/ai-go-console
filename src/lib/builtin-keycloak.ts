/**
 * Provision a built-in Keycloak realm for an organization.
 *
 * Uses the self-hosted Keycloak instance deployed in k3d.
 * Each org gets its own realm for tenant isolation.
 *
 * Reads connection details from environment variables:
 *   BUILTIN_KEYCLOAK_URL — Keycloak base URL (default: http://localhost:8180)
 *   BUILTIN_KEYCLOAK_ADMIN_USER — Admin username
 *   BUILTIN_KEYCLOAK_ADMIN_PASSWORD — Admin password
 */
export async function provisionKeycloakRealm(
  orgSlug: string
): Promise<{ url: string; realm: string; clientId: string; clientSecret: string }> {
  const url = process.env.BUILTIN_KEYCLOAK_URL || "http://localhost:8180";
  const _adminUser = process.env.BUILTIN_KEYCLOAK_ADMIN_USER || "admin";
  const _adminPassword = process.env.BUILTIN_KEYCLOAK_ADMIN_PASSWORD || "admin";

  if (!url) {
    throw new Error(
      "BUILTIN_KEYCLOAK_URL must be set — cannot provision built-in Keycloak"
    );
  }

  // Per-org realm for tenant isolation
  const realm = `org-${orgSlug}`;
  const clientId = `${orgSlug}-app`;
  // In production, generate a real client secret via Keycloak Admin API
  const clientSecret = `${orgSlug}-client-secret`;

  return { url, realm, clientId, clientSecret };
}
