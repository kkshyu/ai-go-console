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
 * Get the model for a given agent role and tier.
 * Priority: userModel override > per-role tier override > global tier default.
 */
export function getModelForTier(
  agentRole: string,
  tier: ModelTier,
  userModel?: string,
): string {
  // User explicit model override takes priority
  if (userModel) return userModel;

  const isProd = process.env.NODE_ENV === "production";
  const overrides = isProd ? ROLE_TIER_OVERRIDES : DEV_ROLE_TIER_OVERRIDES;
  const tierModels = isProd ? PROD_TIER_MODELS : DEV_TIER_MODELS;

  // Check per-role override for this tier
  const roleOverride = overrides[agentRole]?.[tier];
  if (roleOverride) return roleOverride;

  // Fall back to global tier model
  return tierModels[tier];
}
