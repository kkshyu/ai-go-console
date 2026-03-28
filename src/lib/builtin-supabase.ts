/**
 * Provision a built-in Supabase project for an organization.
 *
 * Currently returns mock credentials. When real provisioning is needed,
 * this should call the Supabase Management API to create a project
 * and return the actual project URL + anon key.
 */
export async function provisionSupabaseProject(
  orgSlug: string
): Promise<{ projectUrl: string; apiKey: string }> {
  // Mock provisioning — returns placeholder values.
  // Replace with real Supabase Management API calls when ready.
  const projectRef = `mock-${orgSlug.replace(/[^a-z0-9]/g, "")}`;
  return {
    projectUrl: `https://${projectRef}.supabase.co`,
    apiKey: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key-${projectRef}`,
  };
}
