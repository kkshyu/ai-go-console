/**
 * Multi-Agent System Types
 *
 * PM Agent acts as the central orchestrator, dispatching tasks to
 * specialized agents (Architect, Developer, Reviewer, DevOps) as needed.
 */

export type AgentRole = "pm" | "architect" | "developer" | "reviewer" | "devops";

/** Background agent roles — persist across requests, managed by BackgroundActorSystem */
export type BackgroundAgentRole = "embedding" | "retrieval" | "summarizer" | "file_processor" | "file_analyzer";

export type TaskStatus = "idle" | "running" | "completed" | "error";

/** A single task dispatched by PM to an agent */
export interface AgentTask {
  agentRole: AgentRole;
  actorId?: string; // unique actor instance ID (e.g. "developer-0")
  status: TaskStatus;
  description?: string; // what PM asked this agent to do
  summary?: string; // result summary after completion
}

/** A group of parallel developer tasks running simultaneously */
export interface ParallelTaskGroup {
  groupId: string;
  tasks: AgentTask[];
  status: TaskStatus;
  mergedResult?: string;
}

/** Overall orchestration state managed by PM Agent */
export interface OrchestrationState {
  status: TaskStatus;
  tasks: AgentTask[]; // dispatched tasks (history, in order)
  parallelGroups: ParallelTaskGroup[]; // parallel developer groups
  currentAgent: AgentRole | null; // currently executing agent
  activeActors: string[]; // list of active actor IDs
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

export interface BackgroundAgentMeta {
  role: BackgroundAgentRole;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const BACKGROUND_AGENT_DEFINITIONS: Record<BackgroundAgentRole, BackgroundAgentMeta> = {
  embedding: {
    role: "embedding",
    label: "Embedding",
    icon: "Database",
    color: "text-cyan-500",
    description: "Embedding — generates and stores vector embeddings for content chunks",
  },
  retrieval: {
    role: "retrieval",
    label: "Retrieval",
    icon: "Search",
    color: "text-teal-500",
    description: "Retrieval — searches vector store for relevant context",
  },
  summarizer: {
    role: "summarizer",
    label: "Summarizer",
    icon: "FileText",
    color: "text-indigo-500",
    description: "Summarizer — translates and summarizes agent output for users",
  },
  file_processor: {
    role: "file_processor",
    label: "File Processor",
    icon: "FileSearch",
    color: "text-orange-500",
    description: "File Processor — extracts text from uploaded files and generates embeddings",
  },
  file_analyzer: {
    role: "file_analyzer",
    label: "File Analyzer",
    icon: "FileBarChart",
    color: "text-pink-500",
    description: "File Analyzer — generates summaries and analysis of uploaded files",
  },
};

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  agentRole?: AgentRole;
  fileIds?: string[];
}

export function createInitialOrchestrationState(): OrchestrationState {
  return {
    status: "idle",
    tasks: [],
    parallelGroups: [],
    currentAgent: null,
    activeActors: [],
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

export interface PMDispatchParallelAction {
  action: "dispatch_parallel";
  target: "developer";
  tasks: Array<{
    taskId: string;
    task: string;
    files: string[];
  }>;
}

export interface PMUpdatePRDAction {
  action: "update_prd";
  prd: {
    appName: string;
    description: string;
    targetUsers: string;
    features: string[];
    dataNeeds: string[];
    integrations: string[];
    requiredServices: string[];
  };
}

export type PMAction = PMDispatchAction | PMRespondAction | PMCompleteAction | PMDispatchParallelAction | PMUpdatePRDAction;
