/**
 * Model Tier System
 *
 * 3-tier model mapping for the senior/junior agent hierarchy.
 * Senior agents use high-capability models for planning & synthesis.
 * Junior agents use cost-effective models for bulk execution.
 * Intermediate agents balance quality and cost for complex sub-tasks.
 */

export type ModelTier = "senior" | "intermediate" | "junior";

export interface TierModelMap {
  senior: string;
  intermediate: string;
  junior: string;
}

/**
 * Production tier model mapping
 *
 * Senior:       Claude Opus 4.6   — $5/$25, SWE-bench 80.8%, best reasoning
 * Intermediate: GPT-4.1           — $2/$8,  strong coding, 30% cheaper than GPT-4o
 * Junior:       Gemini 2.5 Flash  — $0.30/$2.50, 1M context, 288% faster than GPT-4o-mini
 */
const PROD_TIER_MODELS: TierModelMap = {
  senior: "anthropic/claude-opus-4.6",
  intermediate: "openai/gpt-4.1",
  junior: "google/gemini-2.5-flash",
};

/**
 * Development tier model mapping
 *
 * Senior:       Claude Sonnet 4.6 — $3/$15, SWE-bench 79.6%, cost-effective for dev
 * Intermediate: GPT-4.1           — $2/$8
 * Junior:       Gemini 2.5 Flash  — $0.30/$2.50
 */
const DEV_TIER_MODELS: TierModelMap = {
  senior: "anthropic/claude-sonnet-4.6",
  intermediate: "openai/gpt-4.1",
  junior: "google/gemini-2.5-flash",
};

/**
 * Per-role overrides for specific tiers.
 * Roles that don't need frontier-class senior models get downgraded to save cost.
 *
 * reviewer/devops/doc_writer: Planning is simpler → Sonnet 4.6 is sufficient as senior
 */
const ROLE_TIER_OVERRIDES: Partial<Record<string, Partial<TierModelMap>>> = {
  reviewer: { senior: "anthropic/claude-sonnet-4.6" },
  devops: { senior: "anthropic/claude-sonnet-4.6" },
  doc_writer: { senior: "anthropic/claude-sonnet-4.6" },
};

/** Dev environment per-role overrides — cheaper models for non-critical roles */
const DEV_ROLE_TIER_OVERRIDES: Partial<Record<string, Partial<TierModelMap>>> = {
  reviewer: { senior: "openai/gpt-4.1" },
  devops: { senior: "openai/gpt-4.1" },
  doc_writer: { senior: "openai/gpt-4.1" },
};

/**
 * Get the environment-appropriate tier model map.
 */
export function getTierModels(): TierModelMap {
  return process.env.NODE_ENV === "production" ? PROD_TIER_MODELS : DEV_TIER_MODELS;
}

/**
 * Read model from environment variable.
 * Convention: AGENT_MODEL_{ROLE}_{TIER} e.g. AGENT_MODEL_PM_SENIOR
 */
function getEnvModel(agentRole: string, tier: ModelTier): string | undefined {
  const envKey = `AGENT_MODEL_${agentRole.toUpperCase()}_${tier.toUpperCase()}`;
  return process.env[envKey] || undefined;
}

/**
 * Get the hard-coded default model for a given agent role and tier.
 * Priority: per-role tier override > global tier default.
 */
export function getHardCodedDefault(agentRole: string, tier: ModelTier): string {
  const isProd = process.env.NODE_ENV === "production";
  const overrides = isProd ? ROLE_TIER_OVERRIDES : DEV_ROLE_TIER_OVERRIDES;
  const tierModels = isProd ? PROD_TIER_MODELS : DEV_TIER_MODELS;

  return overrides[agentRole]?.[tier] || tierModels[tier];
}

/**
 * Get the effective default model (env var > hard-coded) for a role:tier.
 * This is what the UI should show as the "default" value.
 */
export function getEffectiveDefault(agentRole: string, tier: ModelTier): string {
  return getEnvModel(agentRole, tier) || getHardCodedDefault(agentRole, tier);
}

/**
 * Build a map of all role:tier → default model for all agent roles.
 */
export function getAllDefaults(roles: string[]): Record<string, string> {
  const tiers: ModelTier[] = ["senior", "intermediate", "junior"];
  const result: Record<string, string> = {};
  for (const role of roles) {
    for (const tier of tiers) {
      result[`${role}:${tier}`] = getEffectiveDefault(role, tier);
    }
  }
  return result;
}

/** Org-level model config entry */
export interface OrgModelConfig {
  agentRole: string; // format: "role:tier"
  modelId: string;
}

/**
 * Get the model for a given agent role and tier.
 * Priority: orgConfig (DB) > env var > userModel (session fallback) > hard-coded default.
 *
 * userModel is a session-level fallback (e.g. user's chat model selection),
 * NOT a global override. Org configs always take precedence.
 */
export function getModelForTier(
  agentRole: string,
  tier: ModelTier,
  userModel?: string,
  orgConfigs?: OrgModelConfig[],
): string {
  // 1. Org DB config (highest priority — admin-controlled)
  const orgOverride = orgConfigs?.find((c) => c.agentRole === `${agentRole}:${tier}`)?.modelId;
  if (orgOverride) return orgOverride;

  // 2. Environment variable
  const envModel = getEnvModel(agentRole, tier);
  if (envModel) return envModel;

  // 3. Session-level user model (fallback, not override)
  if (userModel) return userModel;

  // 4. Hard-coded default
  return getHardCodedDefault(agentRole, tier);
}
