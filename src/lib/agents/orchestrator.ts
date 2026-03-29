/**
 * Multi-Agent Orchestrator
 *
 * PM Agent is the central orchestrator. It receives user messages and
 * decides which specialist agents to dispatch tasks to. The orchestrator
 * parses PM's JSON actions and routes accordingly.
 */

import type {
  AgentRole,
  AgentMessage,
  OrchestrationState,
  PMAction,
} from "./types";
import { createInitialOrchestrationState } from "./types";
import {
  buildPMPrompt,
  buildArchitectPrompt,
  buildDeveloperPrompt,
  buildReviewerPrompt,
  buildDevOpsPrompt,
  buildAppDevPMPrompt,
  buildAppDevArchitectPrompt,
  buildAppDevDeveloperPrompt,
  buildAppDevReviewerPrompt,
  buildAppDevDevOpsPrompt,
  buildUXDesignerPrompt,
  buildTesterPrompt,
  buildDBMigratorPrompt,
  buildDocWriterPrompt,
} from "./prompts";

export interface ServiceInstance {
  id: string;
  name: string;
  type: string;
  status?: "ok" | "failed" | "untested";
  message?: string;
}

export interface OrchestratorContext {
  /** Actual service instances configured and authorized for the user */
  serviceInstances?: ServiceInstance[];
  appContext?: string; // For existing app development
  orchestrationState?: OrchestrationState;
  /** When set, PM has dispatched to this agent — route to it instead of PM */
  dispatchedAgent?: AgentRole;
  /** Task description from PM for the dispatched agent */
  dispatchedTask?: string;
}

export interface AgentDispatch {
  agentRole: AgentRole;
  systemPrompt: string;
  orchestrationState: OrchestrationState;
}

/**
 * Determine which agent should handle the current message.
 *
 * - If PM dispatched an agent, route to that agent.
 * - Otherwise, route to PM.
 */
export function routeMessage(
  messages: AgentMessage[],
  context: OrchestratorContext
): AgentDispatch {
  const state = context.orchestrationState || createInitialOrchestrationState();

  // If PM dispatched a specialist agent, route to it
  if (context.dispatchedAgent && context.dispatchedAgent !== "pm") {
    return buildSpecialistDispatch(
      context.dispatchedAgent,
      context.dispatchedTask || "",
      state,
      context
    );
  }

  // Default: route to PM
  return buildPMDispatch(state, context);
}

/**
 * Parse PM Agent's JSON output to determine what action to take.
 * PM may output multiple JSON blocks (e.g. update_prd + dispatch).
 * Returns all parsed actions in order.
 */
export function parsePMActions(content: string): PMAction[] {
  const actions: PMAction[] = [];
  const jsonBlocks = content.matchAll(/```json\s*\n([\s\S]*?)\n```/g);

  for (const match of jsonBlocks) {
    try {
      const parsed = JSON.parse(match[1]);
      const action = parseSingleAction(parsed);
      if (action) actions.push(action);
    } catch {
      // skip malformed JSON blocks
    }
  }

  return actions;
}

/**
 * Parse PM Agent's JSON output to determine what action to take.
 * Returns the first non-update_prd action (backward compatible).
 */
export function parsePMAction(content: string): PMAction | null {
  const actions = parsePMActions(content);
  // Return first non-prd action for backward compat, or the only action
  return actions.find((a) => a.action !== "update_prd") || actions[0] || null;
}

function parseSingleAction(parsed: Record<string, unknown>): PMAction | null {
  const action = parsed.action as string;

  if (action === "update_prd" && parsed.prd) {
    const prd = parsed.prd as Record<string, unknown>;
    return {
      action: "update_prd",
      prd: {
        appName: (prd.appName as string) ?? "",
        description: (prd.description as string) ?? "",
        targetUsers: (prd.targetUsers as string) ?? "",
        features: Array.isArray(prd.features) ? prd.features : [],
        dataNeeds: Array.isArray(prd.dataNeeds) ? prd.dataNeeds : [],
        integrations: Array.isArray(prd.integrations) ? prd.integrations : [],
        requiredServices: Array.isArray(prd.requiredServices) ? prd.requiredServices : [],
      },
    };
  }

  if (action === "dispatch" && parsed.target && parsed.task) {
    return {
      action: "dispatch",
      target: parsed.target as AgentRole,
      task: parsed.task as string,
    };
  }

  if (action === "respond" && parsed.message) {
    return {
      action: "respond",
      message: parsed.message as string,
    };
  }

  if (action === "complete") {
    return {
      action: "complete",
      summary: (parsed.summary as string) || "Task completed",
    };
  }

  if (action === "dispatch_parallel" && parsed.target === "developer" && Array.isArray(parsed.tasks)) {
    return {
      action: "dispatch_parallel",
      target: "developer",
      tasks: (parsed.tasks as Array<{ taskId?: string; task?: string; files?: string[] }>).map((t, i) => ({
        taskId: t.taskId || `dev-task-${i}`,
        task: t.task || "",
        files: t.files || [],
      })),
    };
  }

  return null;
}

/**
 * Parse a specialist agent's JSON output to extract a summary.
 * Also detects if the agent reported being blocked.
 */
export function parseAgentResult(content: string): { summary: string; blocked: boolean; blockedReason?: string } {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return { summary: content.slice(0, 200), blocked: false };

  try {
    const parsed = JSON.parse(jsonMatch[1]);

    // Check if agent reported being blocked
    if (parsed.status === "blocked") {
      return {
        summary: parsed.blockedReason || "Agent could not complete the task",
        blocked: true,
        blockedReason: parsed.blockedReason,
      };
    }

    let summary = "Task completed";
    if (parsed.action === "modify_files" && parsed.files) {
      const count = parsed.files.length;
      summary = `Modified ${count} file(s)${parsed.summary ? ": " + parsed.summary : ""}`;
    } else if (parsed.design?.architecture) summary = parsed.design.architecture;
    else if (parsed.review?.summary) summary = parsed.review.summary;
    else if (parsed.deployment?.notes) summary = parsed.deployment.notes;
    else if (parsed.name) summary = `App: ${parsed.name}`;
    else if (parsed.changes?.description) summary = parsed.changes.description;
    else if (parsed.action) summary = parsed.action;

    return { summary, blocked: false };
  } catch {
    return { summary: content.slice(0, 200), blocked: false };
  }
}

/**
 * Update orchestration state when dispatching to an agent.
 */
export function stateForDispatch(
  state: OrchestrationState,
  agentRole: AgentRole,
  description?: string
): OrchestrationState {
  return {
    ...state,
    status: "running",
    currentAgent: agentRole,
    tasks: [
      ...state.tasks,
      { agentRole, status: "running", description },
    ],
  };
}

/**
 * Update orchestration state when an agent completes.
 */
export function stateForAgentComplete(
  state: OrchestrationState,
  agentRole: AgentRole,
  summary?: string
): OrchestrationState {
  return {
    ...state,
    currentAgent: "pm", // control returns to PM
    tasks: state.tasks.map((t) =>
      t.agentRole === agentRole && t.status === "running"
        ? { ...t, status: "completed" as const, summary }
        : t
    ),
  };
}

/**
 * Update orchestration state when PM marks the task complete.
 */
export function stateForComplete(
  state: OrchestrationState,
  summary?: string
): OrchestrationState {
  return {
    ...state,
    status: "completed",
    currentAgent: null,
    tasks: state.tasks.map((t) =>
      t.status === "running"
        ? { ...t, status: "completed" as const, summary }
        : t
    ),
  };
}

// ---- Internal helpers ----

function buildPMDispatch(
  state: OrchestrationState,
  context: OrchestratorContext
): AgentDispatch {
  const prompt = context.appContext
    ? buildAppDevPMPrompt(context.appContext)
    : buildPMPrompt(context.serviceInstances ?? []);

  return {
    agentRole: "pm",
    systemPrompt: prompt,
    orchestrationState: {
      ...state,
      status: "running",
      currentAgent: "pm",
    },
  };
}

function buildSpecialistDispatch(
  agentRole: AgentRole,
  task: string,
  state: OrchestrationState,
  context: OrchestratorContext
): AgentDispatch {
  const promptBuilders: Record<AgentRole, () => string> = {
    pm: () => buildPMPrompt(context.serviceInstances ?? []),
    architect: () =>
      context.appContext
        ? buildAppDevArchitectPrompt(context.appContext, context.serviceInstances)
        : buildArchitectPrompt(context.serviceInstances),
    developer: () =>
      context.appContext
        ? buildAppDevDeveloperPrompt(context.appContext)
        : buildDeveloperPrompt(),
    reviewer: () =>
      context.appContext
        ? buildAppDevReviewerPrompt(context.appContext)
        : buildReviewerPrompt(),
    devops: () =>
      context.appContext
        ? buildAppDevDevOpsPrompt(context.appContext)
        : buildDevOpsPrompt(),
    ux_designer: () => buildUXDesignerPrompt(),
    tester: () => buildTesterPrompt(),
    db_migrator: () => buildDBMigratorPrompt(),
    doc_writer: () => buildDocWriterPrompt(),
  };

  // Prepend PM's task description to the system prompt
  const basePrompt = promptBuilders[agentRole]();
  const systemPrompt = `${basePrompt}\n\n--- TASK FROM PM ---\n${task}`;

  return {
    agentRole,
    systemPrompt,
    orchestrationState: stateForDispatch(state, agentRole, task),
  };
}

/**
 * Build minimal context string from previous agent JSON outputs.
 * Only extracts structured JSON blocks — never full conversation text.
 * This keeps token usage low while preserving all decision-critical data.
 */
export function buildAgentContext(messages: AgentMessage[]): string {
  const contextParts: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const jsonMatch = msg.content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      contextParts.push(
        `[${msg.agentRole?.toUpperCase() || "AGENT"}]: ${jsonMatch[1]}`
      );
    }
  }

  return contextParts.length > 0
    ? `\n\nAgent outputs:\n${contextParts.join("\n")}`
    : "";
}

/**
 * Update orchestration state when dispatching parallel tasks.
 */
export function stateForParallelDispatch(
  state: OrchestrationState,
  groupId: string,
  tasks: Array<{ taskId: string; description: string }>
): OrchestrationState {
  const parallelTasks = tasks.map((t, i) => ({
    agentRole: "developer" as AgentRole,
    actorId: `developer-${i}`,
    status: "running" as const,
    description: t.description,
  }));

  return {
    ...state,
    status: "running",
    currentAgent: "developer",
    parallelGroups: [
      ...(state.parallelGroups || []),
      {
        groupId,
        tasks: parallelTasks,
        status: "running",
      },
    ],
  };
}

/**
 * Update orchestration state when one parallel task completes.
 */
export function stateForParallelTaskComplete(
  state: OrchestrationState,
  groupId: string,
  taskId: string,
  summary: string
): OrchestrationState {
  return {
    ...state,
    parallelGroups: (state.parallelGroups || []).map((g) => {
      if (g.groupId !== groupId) return g;
      const updatedTasks = g.tasks.map((t) =>
        t.actorId?.includes(taskId) || t.description?.includes(taskId)
          ? { ...t, status: "completed" as const, summary }
          : t
      );
      const allDone = updatedTasks.every((t) => t.status === "completed");
      return {
        ...g,
        tasks: updatedTasks,
        status: allDone ? ("completed" as const) : g.status,
      };
    }),
  };
}

/**
 * Update orchestration state when all parallel tasks in a group complete.
 */
export function stateForParallelGroupComplete(
  state: OrchestrationState,
  groupId: string,
  mergedResult: string
): OrchestrationState {
  return {
    ...state,
    currentAgent: "pm",
    parallelGroups: (state.parallelGroups || []).map((g) =>
      g.groupId === groupId
        ? {
            ...g,
            status: "completed" as const,
            mergedResult,
            tasks: g.tasks.map((t) => ({ ...t, status: "completed" as const })),
          }
        : g
    ),
  };
}

export { createInitialOrchestrationState };
