/**
 * Multi-Agent Orchestrator
 *
 * Routes user messages to the appropriate agent based on the current
 * pipeline stage and message content. Manages stage transitions.
 */

import type {
  AgentRole,
  PipelineStage,
  PipelineState,
  AgentMessage,
} from "./types";
import {
  PIPELINE_STAGES,
  STAGE_AGENT_MAP,
  createInitialPipelineState,
} from "./types";
import {
  buildPMPrompt,
  buildArchitectPrompt,
  buildDeveloperPrompt,
  buildReviewerPrompt,
  buildDevOpsPrompt,
  buildAppDevPMPrompt,
  buildAppDevDeveloperPrompt,
} from "./prompts";

export interface OrchestratorContext {
  allowedServices: string[];
  appContext?: string; // For existing app development
  pipelineState?: PipelineState;
}

export interface AgentDispatch {
  agentRole: AgentRole;
  stage: PipelineStage;
  systemPrompt: string;
  pipelineState: PipelineState;
}

/**
 * Determine which agent should handle the current message
 * based on pipeline state and message content.
 */
export function routeMessage(
  messages: AgentMessage[],
  context: OrchestratorContext
): AgentDispatch {
  const state = context.pipelineState || createInitialPipelineState();

  // Check if the last assistant message contained a stage-completion action
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  if (lastAssistant) {
    const advancedState = checkStageAdvancement(lastAssistant.content, state);
    if (advancedState) {
      return buildDispatch(advancedState, context);
    }
  }

  // For existing app development, use simplified two-agent flow
  if (context.appContext) {
    return routeAppDevMessage(messages, state, context);
  }

  // Default: stay on current stage
  return buildDispatch(state, context);
}

/**
 * Check if an assistant message contains an action that advances the pipeline
 */
function checkStageAdvancement(
  content: string,
  state: PipelineState
): PipelineState | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const action = parsed.action as string;

    const actionStageMap: Record<string, PipelineStage> = {
      pm_spec: "requirements",
      pm_analysis: "requirements",
      architect_design: "architecture",
      create_app: "coding",
      update_app: "coding",
      review_result: "review",
      deploy_ready: "deployment",
    };

    const completedStage = actionStageMap[action];
    if (!completedStage) return null;

    const newState = { ...state };
    newState.stages = { ...state.stages };
    newState.stages[completedStage] = {
      status: "completed",
      summary: extractSummary(parsed),
    };

    if (!newState.completedStages.includes(completedStage)) {
      newState.completedStages = [...newState.completedStages, completedStage];
    }

    // Advance to next stage
    const currentIndex = PIPELINE_STAGES.indexOf(completedStage);
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      const nextStage = PIPELINE_STAGES[currentIndex + 1];
      newState.currentStage = nextStage;
      newState.stages[nextStage] = { status: "running" };
      newState.status = "running";
    } else {
      newState.status = "completed";
    }

    return newState;
  } catch {
    return null;
  }
}

function extractSummary(parsed: Record<string, unknown>): string {
  if (parsed.spec && typeof parsed.spec === "object") {
    const spec = parsed.spec as Record<string, unknown>;
    return (spec.description as string) || "Requirements gathered";
  }
  if (parsed.design && typeof parsed.design === "object") {
    const design = parsed.design as Record<string, unknown>;
    return (design.architecture as string) || "Architecture designed";
  }
  if (parsed.review && typeof parsed.review === "object") {
    const review = parsed.review as Record<string, unknown>;
    return (review.summary as string) || "Review complete";
  }
  return "Stage completed";
}

function routeAppDevMessage(
  messages: AgentMessage[],
  state: PipelineState,
  context: OrchestratorContext
): AgentDispatch {
  // For app development, alternate between PM (analysis) and Developer
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  if (lastAssistant?.agentRole === "pm") {
    // PM analyzed, now developer implements
    return {
      agentRole: "developer",
      stage: "coding",
      systemPrompt: buildAppDevDeveloperPrompt(context.appContext || ""),
      pipelineState: {
        ...state,
        currentStage: "coding",
        stages: { ...state.stages, coding: { status: "running" } },
      },
    };
  }

  // Default: PM analyzes first
  return {
    agentRole: "pm",
    stage: "requirements",
    systemPrompt: buildAppDevPMPrompt(context.appContext || ""),
    pipelineState: {
      ...state,
      currentStage: "requirements",
      stages: { ...state.stages, requirements: { status: "running" } },
    },
  };
}

function buildDispatch(
  state: PipelineState,
  context: OrchestratorContext
): AgentDispatch {
  const agentRole = STAGE_AGENT_MAP[state.currentStage];
  const services = context.allowedServices.join(",");

  const promptBuilders: Record<AgentRole, () => string> = {
    pm: () => buildPMPrompt(context.allowedServices),
    architect: () => buildArchitectPrompt(context.allowedServices),
    developer: () => buildDeveloperPrompt(context.allowedServices),
    reviewer: () => buildReviewerPrompt(),
    devops: () => buildDevOpsPrompt(),
  };

  return {
    agentRole,
    stage: state.currentStage,
    systemPrompt: promptBuilders[agentRole](),
    pipelineState: {
      ...state,
      status: "running",
      stages: {
        ...state.stages,
        [state.currentStage]: { status: "running" },
      },
    },
  };
}

/**
 * Build context string for passing between agents.
 * Includes summaries from all completed stages.
 */
export function buildAgentContext(
  messages: AgentMessage[],
  state: PipelineState
): string {
  const contextParts: string[] = [];

  // Collect JSON action outputs from previous agents
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const jsonMatch = msg.content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      contextParts.push(
        `[${msg.agentRole?.toUpperCase() || "AGENT"} output]: ${jsonMatch[1]}`
      );
    }
  }

  return contextParts.length > 0
    ? `\n\nPrevious agent outputs:\n${contextParts.join("\n\n")}`
    : "";
}

export { createInitialPipelineState };
