/**
 * Multi-Agent System Types
 *
 * Five specialized agents collaborate to build apps:
 * - PM: gathers requirements, creates specs
 * - Architect: designs system, picks template & services
 * - Developer: writes code
 * - Reviewer: reviews quality & security
 * - DevOps: handles deployment & infrastructure
 */

export type AgentRole = "pm" | "architect" | "developer" | "reviewer" | "devops";

export type PipelineStatus = "idle" | "running" | "completed" | "error";

export type PipelineStage =
  | "requirements"
  | "architecture"
  | "coding"
  | "review"
  | "deployment";

export interface AgentMeta {
  role: AgentRole;
  label: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  stage: PipelineStage;
  description: string;
}

export const AGENT_DEFINITIONS: Record<AgentRole, AgentMeta> = {
  pm: {
    role: "pm",
    label: "PM",
    icon: "ClipboardList",
    color: "text-blue-500",
    stage: "requirements",
    description: "Product Manager — gathers requirements and creates specifications",
  },
  architect: {
    role: "architect",
    label: "Architect",
    icon: "Blocks",
    color: "text-purple-500",
    stage: "architecture",
    description: "Architect — designs system architecture and selects technologies",
  },
  developer: {
    role: "developer",
    label: "Developer",
    icon: "Code2",
    color: "text-green-500",
    stage: "coding",
    description: "Developer — writes and generates application code",
  },
  reviewer: {
    role: "reviewer",
    label: "Reviewer",
    icon: "ShieldCheck",
    color: "text-amber-500",
    stage: "review",
    description: "Reviewer — reviews code quality and security",
  },
  devops: {
    role: "devops",
    label: "DevOps",
    icon: "Rocket",
    color: "text-rose-500",
    stage: "deployment",
    description: "DevOps — handles deployment and infrastructure",
  },
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "requirements",
  "architecture",
  "coding",
  "review",
  "deployment",
];

export const STAGE_AGENT_MAP: Record<PipelineStage, AgentRole> = {
  requirements: "pm",
  architecture: "architect",
  coding: "developer",
  review: "reviewer",
  deployment: "devops",
};

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  agentRole?: AgentRole;
  stage?: PipelineStage;
}

export interface PipelineState {
  status: PipelineStatus;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stages: Record<
    PipelineStage,
    {
      status: PipelineStatus;
      summary?: string;
    }
  >;
}

export function createInitialPipelineState(): PipelineState {
  return {
    status: "idle",
    currentStage: "requirements",
    completedStages: [],
    stages: {
      requirements: { status: "idle" },
      architecture: { status: "idle" },
      coding: { status: "idle" },
      review: { status: "idle" },
      deployment: { status: "idle" },
    },
  };
}
