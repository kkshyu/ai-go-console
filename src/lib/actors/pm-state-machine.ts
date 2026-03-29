/**
 * PM State Machine
 *
 * Pure-function state machine for PM Agent orchestration.
 * Replaces the implicit while-loop in PMActor.runPMLoop() with explicit
 * states, events, and transitions. Side effects are declared as data
 * (PMSideEffect[]) and executed by PMActor — the transition function itself
 * is pure and independently unit-testable.
 *
 * States: idle → thinking → (waiting_single | waiting_parallel | waiting_dag) → thinking → ... → completed | error
 */

import type { AgentRole, OrchestrationState, PMAction } from "../agents/types";
import type {
  TaskPayload,
  TaskResultPayload,
  ParallelResultPayload,
  ReportPayload,
  ErrorPayload,
} from "./types";

// ---- PM State Types ----

export type PMState =
  | { type: "idle" }
  | { type: "thinking"; step: number }
  | { type: "waiting_single"; target: AgentRole; actorId: string; dispatchedAt: number }
  | { type: "waiting_parallel"; groupId: string; expected: number; received: Set<string> }
  | { type: "waiting_dag"; dagId: string; totalNodes: number; completedNodes: Set<string> }
  | { type: "completed"; summary: string }
  | { type: "error"; reason: string };

// ---- PM Event Types ----

export type PMEvent =
  | { type: "start"; payload: TaskPayload }
  | { type: "llm_result"; content: string; actions: PMAction[] }
  | { type: "agent_result"; payload: TaskResultPayload; from: string }
  | { type: "agent_report"; payload: ReportPayload; from: string }
  | { type: "parallel_result"; payload: ParallelResultPayload }
  | { type: "all_parallel_collected" }
  | { type: "dag_node_complete"; nodeId: string; success: boolean }
  | { type: "dag_complete"; orchState: OrchestrationState }
  | { type: "agent_error"; payload: ErrorPayload }
  | { type: "timeout"; scope: "request" | "parallel" | "dag" }
  | { type: "abort" };

// ---- Side Effect Types (declarative) ----

export type PMSideEffect =
  | { type: "call_llm" }
  | { type: "dispatch_agent"; target: AgentRole; task: string }
  | { type: "dispatch_parallel"; tasks: Array<{ taskId: string; task: string; files: string[] }> }
  | { type: "execute_dag"; dag: import("../agents/types").ExecutionDAG }
  | { type: "send_response"; content: string; action: string }
  | { type: "signal_completion"; summary?: string }
  | { type: "send_event"; data: unknown }
  | { type: "save_artifact"; role: AgentRole; content: string; actorId?: string; taskId?: string }
  | { type: "post_process"; content: string }
  | { type: "add_message"; role: "user" | "assistant"; content: string; agentRole?: AgentRole }
  | { type: "merge_parallel" }
  | { type: "log_warning"; message: string };

// ---- Transition Result ----

export interface TransitionResult {
  nextState: PMState;
  sideEffects: PMSideEffect[];
}

// ---- Constants ----

export const MAX_STEPS = 20;

// ---- Transition Function (pure) ----

export function transition(state: PMState, event: PMEvent): TransitionResult {
  // Terminal states — no transitions regardless of event
  if (state.type === "completed" || state.type === "error") {
    return { nextState: state, sideEffects: [] };
  }

  // Global events that work in any non-terminal state
  if (event.type === "abort") {
    return {
      nextState: { type: "error", reason: "Aborted" },
      sideEffects: [{ type: "signal_completion" }],
    };
  }

  if (event.type === "timeout" && event.scope === "request") {
    return {
      nextState: { type: "error", reason: "Request timeout" },
      sideEffects: [
        { type: "send_event", data: { error: "Request timeout reached" } },
        { type: "signal_completion" },
      ],
    };
  }

  switch (state.type) {
    case "idle":
      return handleIdle(state, event);
    case "thinking":
      return handleThinking(state, event);
    case "waiting_single":
      return handleWaitingSingle(state, event);
    case "waiting_parallel":
      return handleWaitingParallel(state, event);
    case "waiting_dag":
      return handleWaitingDAG(state, event);
    default:
      return {
        nextState: { type: "error", reason: `Invalid state: ${(state as PMState).type}` },
        sideEffects: [{ type: "signal_completion" }],
      };
  }
}

// ---- State Handlers ----

function handleIdle(_state: PMState, event: PMEvent): TransitionResult {
  if (event.type === "start") {
    return {
      nextState: { type: "thinking", step: 0 },
      sideEffects: [
        { type: "add_message", role: "user", content: event.payload.task },
        { type: "call_llm" },
      ],
    };
  }

  return {
    nextState: { type: "error", reason: `Unexpected event '${event.type}' in idle state` },
    sideEffects: [{ type: "signal_completion" }],
  };
}

function handleThinking(state: PMState & { type: "thinking" }, event: PMEvent): TransitionResult {
  if (event.type !== "llm_result") {
    return {
      nextState: state,
      sideEffects: [{ type: "log_warning", message: `Ignoring '${event.type}' event in thinking state` }],
    };
  }

  const { content, actions } = event;
  const step = state.step + 1;

  // Check max steps
  if (step > MAX_STEPS) {
    return {
      nextState: { type: "completed", summary: "Max interactions reached" },
      sideEffects: [{ type: "signal_completion", summary: "Max interactions reached" }],
    };
  }

  // Save PM output
  const sideEffects: PMSideEffect[] = [
    { type: "save_artifact", role: "pm", content },
    { type: "add_message", role: "assistant", content, agentRole: "pm" },
  ];

  // Process update_prd actions first
  for (const act of actions) {
    if (act.action === "update_prd") {
      sideEffects.push({ type: "send_event", data: { prdUpdate: (act as { prd: unknown }).prd } });
    }
  }

  // Find main action (non-prd)
  const mainAction = actions.find((a) => a.action !== "update_prd");

  if (!mainAction) {
    // Only had update_prd — needs user input
    return {
      nextState: { type: "completed", summary: "Awaiting user input" },
      sideEffects: [
        ...sideEffects,
        { type: "send_event", data: { agentComplete: true, agentRole: "pm", rawContent: content, needsUserInput: true } },
        { type: "signal_completion" },
      ],
    };
  }

  switch (mainAction.action) {
    case "dispatch": {
      const target = mainAction.target as AgentRole;
      const task = mainAction.task as string;
      return {
        nextState: {
          type: "waiting_single",
          target,
          actorId: `${target}-0`,
          dispatchedAt: Date.now(),
        },
        sideEffects: [
          ...sideEffects,
          { type: "send_event", data: { agentComplete: true, agentRole: "pm", rawContent: content } },
          { type: "dispatch_agent", target, task },
        ],
      };
    }

    case "dispatch_parallel": {
      const tasks = (mainAction as { tasks: Array<{ taskId: string; task: string; files: string[] }> }).tasks;
      return {
        nextState: {
          type: "waiting_parallel",
          groupId: `parallel-${Date.now()}`,
          expected: tasks.length,
          received: new Set(),
        },
        sideEffects: [
          ...sideEffects,
          { type: "send_event", data: { agentComplete: true, agentRole: "pm", rawContent: content } },
          { type: "dispatch_parallel", tasks },
        ],
      };
    }

    case "execute_dag": {
      const dag = (mainAction as { dag: import("../agents/types").ExecutionDAG }).dag;
      return {
        nextState: {
          type: "waiting_dag",
          dagId: `dag-${Date.now()}`,
          totalNodes: dag.nodes.length,
          completedNodes: new Set(),
        },
        sideEffects: [
          ...sideEffects,
          { type: "send_event", data: { agentComplete: true, agentRole: "pm", rawContent: content } },
          { type: "execute_dag", dag },
        ],
      };
    }

    case "respond": {
      return {
        nextState: { type: "completed", summary: "Responded to user" },
        sideEffects: [
          ...sideEffects,
          { type: "send_response", content, action: "respond" },
          { type: "signal_completion" },
        ],
      };
    }

    case "complete": {
      const summary = (mainAction as { summary: string }).summary || "Task completed";
      return {
        nextState: { type: "completed", summary },
        sideEffects: [
          ...sideEffects,
          { type: "send_response", content, action: "complete" },
          { type: "signal_completion", summary },
        ],
      };
    }

    default:
      // Unknown action — treat as respond
      return {
        nextState: { type: "completed", summary: "Unknown action" },
        sideEffects: [
          ...sideEffects,
          { type: "send_response", content, action: "default" },
          { type: "signal_completion" },
        ],
      };
  }
}

function handleWaitingSingle(state: PMState & { type: "waiting_single" }, event: PMEvent): TransitionResult {
  switch (event.type) {
    case "agent_result": {
      const { payload } = event;
      return {
        nextState: { type: "thinking", step: 0 }, // step is reset; PMActor tracks total
        sideEffects: [
          { type: "save_artifact", role: payload.agentRole, content: payload.content },
          { type: "post_process", content: payload.content },
          { type: "send_event", data: { agentComplete: true, agentRole: payload.agentRole, rawContent: payload.content } },
          { type: "add_message", role: "assistant", content: payload.content, agentRole: payload.agentRole },
          { type: "call_llm" },
        ],
      };
    }

    case "agent_report": {
      const { payload } = event;
      const contentWithDiscussion = payload.discussionLog && payload.discussionLog.length > 0
        ? `${payload.content}\n\n--- PEER DISCUSSIONS ---\n${payload.discussionLog.join("\n")}`
        : payload.content;
      return {
        nextState: { type: "thinking", step: 0 },
        sideEffects: [
          { type: "save_artifact", role: payload.agentRole, content: payload.content },
          { type: "post_process", content: payload.content },
          { type: "send_event", data: { agentComplete: true, agentRole: payload.agentRole, rawContent: payload.content } },
          ...(payload.discussionLog && payload.discussionLog.length > 0
            ? [{ type: "send_event" as const, data: { discussionComplete: { agentRole: payload.agentRole, exchangeCount: payload.discussionLog.length } } }]
            : []),
          { type: "add_message", role: "assistant" as const, content: contentWithDiscussion, agentRole: payload.agentRole },
          { type: "call_llm" },
        ],
      };
    }

    case "agent_error": {
      const { payload } = event;
      // Transition back to thinking so PM can decide how to recover
      return {
        nextState: { type: "thinking", step: 0 },
        sideEffects: [
          { type: "add_message", role: "assistant", content: `\`\`\`json\n{"status": "blocked", "blockedReason": "${payload.error}"}\n\`\`\``, agentRole: payload.agentRole },
          { type: "call_llm" },
        ],
      };
    }

    case "timeout": {
      if (event.scope === "parallel" || event.scope === "dag") {
        // Irrelevant timeout for this state
        return { nextState: state, sideEffects: [] };
      }
      return {
        nextState: { type: "error", reason: "Request timeout" },
        sideEffects: [{ type: "signal_completion" }],
      };
    }

    default:
      return {
        nextState: state,
        sideEffects: [{ type: "log_warning", message: `Ignoring '${event.type}' in waiting_single state` }],
      };
  }
}

function handleWaitingParallel(state: PMState & { type: "waiting_parallel" }, event: PMEvent): TransitionResult {
  switch (event.type) {
    case "parallel_result": {
      const { payload } = event;
      const newReceived = new Set(state.received);
      newReceived.add(payload.taskId);

      const newState: PMState = {
        ...state,
        received: newReceived,
      };

      const sideEffects: PMSideEffect[] = [
        { type: "save_artifact", role: payload.agentRole, content: payload.content, actorId: payload.actorId, taskId: payload.taskId },
      ];

      // Check if all results collected
      if (newReceived.size >= state.expected) {
        return {
          nextState: { type: "thinking", step: 0 },
          sideEffects: [...sideEffects, { type: "merge_parallel" }, { type: "call_llm" }],
        };
      }

      return { nextState: newState, sideEffects };
    }

    case "all_parallel_collected": {
      return {
        nextState: { type: "thinking", step: 0 },
        sideEffects: [{ type: "merge_parallel" }, { type: "call_llm" }],
      };
    }

    case "agent_error": {
      // A parallel worker failed — count as collected with error
      const { payload } = event;
      const newReceived = new Set(state.received);
      newReceived.add(payload.actorId);

      const sideEffects: PMSideEffect[] = [
        { type: "log_warning", message: `Parallel worker ${payload.actorId} failed: ${payload.error}` },
      ];

      if (newReceived.size >= state.expected) {
        return {
          nextState: { type: "thinking", step: 0 },
          sideEffects: [...sideEffects, { type: "merge_parallel" }, { type: "call_llm" }],
        };
      }

      return {
        nextState: { ...state, received: newReceived },
        sideEffects,
      };
    }

    case "timeout": {
      if (event.scope === "parallel") {
        // Force merge with whatever we have
        return {
          nextState: { type: "thinking", step: 0 },
          sideEffects: [
            { type: "log_warning", message: `Parallel timeout: ${state.received.size}/${state.expected} collected` },
            { type: "merge_parallel" },
            { type: "call_llm" },
          ],
        };
      }
      return { nextState: state, sideEffects: [] };
    }

    default:
      return {
        nextState: state,
        sideEffects: [{ type: "log_warning", message: `Ignoring '${event.type}' in waiting_parallel state` }],
      };
  }
}

function handleWaitingDAG(state: PMState & { type: "waiting_dag" }, event: PMEvent): TransitionResult {
  switch (event.type) {
    case "dag_node_complete": {
      const newCompleted = new Set(state.completedNodes);
      newCompleted.add(event.nodeId);

      return {
        nextState: { ...state, completedNodes: newCompleted },
        sideEffects: [
          { type: "send_event", data: { dagNodeComplete: { nodeId: event.nodeId, success: event.success } } },
        ],
      };
    }

    case "dag_complete": {
      return {
        nextState: { type: "thinking", step: 0 },
        sideEffects: [
          { type: "send_event", data: { dagComplete: true } },
          { type: "call_llm" },
        ],
      };
    }

    case "agent_error": {
      // DAG executor handles per-node errors internally
      return {
        nextState: state,
        sideEffects: [
          { type: "log_warning", message: `DAG node error: ${event.payload.error}` },
        ],
      };
    }

    case "timeout": {
      if (event.scope === "dag") {
        return {
          nextState: { type: "error", reason: "DAG execution timeout" },
          sideEffects: [
            { type: "send_event", data: { error: "DAG execution timeout" } },
            { type: "signal_completion" },
          ],
        };
      }
      return { nextState: state, sideEffects: [] };
    }

    default:
      return {
        nextState: state,
        sideEffects: [{ type: "log_warning", message: `Ignoring '${event.type}' in waiting_dag state` }],
      };
  }
}

// ---- Utility ----

/** Check if a state is terminal (completed or error). */
export function isTerminal(state: PMState): boolean {
  return state.type === "completed" || state.type === "error";
}

/** Get a human-readable description of the current state. */
export function describeState(state: PMState): string {
  switch (state.type) {
    case "idle": return "Idle";
    case "thinking": return `Thinking (step ${state.step})`;
    case "waiting_single": return `Waiting for ${state.target} (${state.actorId})`;
    case "waiting_parallel": return `Waiting for parallel results (${state.received.size}/${state.expected})`;
    case "waiting_dag": return `Executing DAG (${state.completedNodes.size}/${state.totalNodes} nodes)`;
    case "completed": return `Completed: ${state.summary}`;
    case "error": return `Error: ${state.reason}`;
  }
}
