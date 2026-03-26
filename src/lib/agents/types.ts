/**
 * Multi-Agent System Types
 *
 * PM Agent acts as the central orchestrator, dispatching tasks to
 * specialized agents (Architect, Developer, Reviewer, DevOps) as needed.
 */

export type AgentRole = "pm" | "architect" | "developer" | "reviewer" | "devops";

export type TaskStatus = "idle" | "running" | "completed" | "error";

/** A single task dispatched by PM to an agent */
export interface AgentTask {
  agentRole: AgentRole;
  status: TaskStatus;
  description?: string; // what PM asked this agent to do
  summary?: string; // result summary after completion
}

/** Overall orchestration state managed by PM Agent */
export interface OrchestrationState {
  status: TaskStatus;
  tasks: AgentTask[]; // dispatched tasks (history, in order)
  currentAgent: AgentRole | null; // currently executing agent
}

export interface AgentMeta {
  role: AgentRole;
  label: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  description: string;
}

export const AGENT_DEFINITIONS: Record<AgentRole, AgentMeta> = {
  pm: {
    role: "pm",
    label: "PM",
    icon: "ClipboardList",
    color: "text-blue-500",
    description: "Product Manager — orchestrates agents and manages requirements",
  },
  architect: {
    role: "architect",
    label: "Architect",
    icon: "Blocks",
    color: "text-purple-500",
    description: "Architect — designs system architecture and selects technologies",
  },
  developer: {
    role: "developer",
    label: "Developer",
    icon: "Code2",
    color: "text-green-500",
    description: "Developer — writes and generates application code",
  },
  reviewer: {
    role: "reviewer",
    label: "Reviewer",
    icon: "ShieldCheck",
    color: "text-amber-500",
    description: "Reviewer — reviews code quality and security",
  },
  devops: {
    role: "devops",
    label: "DevOps",
    icon: "Rocket",
    color: "text-rose-500",
    description: "DevOps — handles deployment and infrastructure",
  },
};

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  agentRole?: AgentRole;
}

export function createInitialOrchestrationState(): OrchestrationState {
  return {
    status: "idle",
    tasks: [],
    currentAgent: null,
  };
}

// ---- PM Action types (parsed from PM Agent JSON output) ----

export interface PMDispatchAction {
  action: "dispatch";
  target: AgentRole;
  task: string;
}

export interface PMRespondAction {
  action: "respond";
  message: string;
}

export interface PMCompleteAction {
  action: "complete";
  summary: string;
}

export type PMAction = PMDispatchAction | PMRespondAction | PMCompleteAction;
