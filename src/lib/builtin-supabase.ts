/**
 * Provision a built-in Supabase project for an organization.
 *
 * Uses the self-hosted Supabase instance deployed in k3d.
 * All orgs share the same Supabase instance; per-org isolation
 * is handled via RLS policies and separate schemas.
 *
 * Reads connection details from environment variables:
 *   BUILTIN_SUPABASE_URL  — Kong API gateway URL (default: http://localhost:54321)
 *   BUILTIN_SUPABASE_ANON_KEY — JWT anon key for the instance
 *   BUILTIN_SUPABASE_SERVICE_ROLE_KEY — JWT service_role key
 */
export async function provisionSupabaseProject(
  _orgSlug: string
): Promise<{ projectUrl: string; apiKey: string; serviceRoleKey: string }> {
  const projectUrl = process.env.BUILTIN_SUPABASE_URL || "http://localhost:54321";
  const apiKey = process.env.BUILTIN_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.BUILTIN_SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !serviceRoleKey) {
    throw new Error(
      "BUILTIN_SUPABASE_ANON_KEY and BUILTIN_SUPABASE_SERVICE_ROLE_KEY must be set — cannot provision built-in Supabase"
    );
  }

  return { projectUrl, apiKey, serviceRoleKey };
}
