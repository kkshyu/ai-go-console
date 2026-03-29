import { describe, test, expect } from "vitest";
import {
  transition,
  isTerminal,
  describeState,
  MAX_STEPS,
  type PMState,
  type PMEvent,
} from "../pm-state-machine";

describe("PM State Machine", () => {
  // ---- Idle State ----

  describe("idle state", () => {
    const idle: PMState = { type: "idle" };

    test("transitions to thinking on start event", () => {
      const event: PMEvent = {
        type: "start",
        payload: { task: "Build a todo app" },
      };
      const { nextState, sideEffects } = transition(idle, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "call_llm" }),
      );
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "add_message", role: "user" }),
      );
    });

    test("transitions to error on unexpected event", () => {
      const event: PMEvent = {
        type: "agent_result",
        payload: {
          agentRole: "architect",
          content: "test",
          summary: "test",
          blocked: false,
        },
        from: "architect-0",
      };
      const { nextState } = transition(idle, event);
      expect(nextState.type).toBe("error");
    });
  });

  // ---- Thinking State ----

  describe("thinking state", () => {
    const thinking: PMState = { type: "thinking", step: 0 };

    test("transitions to waiting_single on dispatch action", () => {
      const event: PMEvent = {
        type: "llm_result",
        content: "dispatch output",
        actions: [{ action: "dispatch", target: "architect", task: "Design the system" }],
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("waiting_single");
      if (nextState.type === "waiting_single") {
        expect(nextState.target).toBe("architect");
      }
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "dispatch_agent", target: "architect" }),
      );
    });

    test("transitions to waiting_parallel on dispatch_parallel action", () => {
      const tasks = [
        { taskId: "t1", task: "Build UI", files: ["src/app.tsx"] },
        { taskId: "t2", task: "Build API", files: ["src/api.ts"] },
      ];
      const event: PMEvent = {
        type: "llm_result",
        content: "parallel output",
        actions: [{ action: "dispatch_parallel", target: "developer", tasks }],
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("waiting_parallel");
      if (nextState.type === "waiting_parallel") {
        expect(nextState.expected).toBe(2);
        expect(nextState.received.size).toBe(0);
      }
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "dispatch_parallel" }),
      );
    });

    test("transitions to waiting_dag on execute_dag action", () => {
      const dag = {
        nodes: [
          { id: "architect-0", role: "architect" as const, task: "Design", dependsOn: [] },
          { id: "developer-0", role: "developer" as const, task: "Build", dependsOn: ["architect-0"] },
        ],
        metadata: { phases: [["architect-0"], ["developer-0"]], parallelismDegree: 1, estimatedDuration: 30000 },
      };
      const event: PMEvent = {
        type: "llm_result",
        content: "dag output",
        actions: [{ action: "execute_dag", dag }],
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("waiting_dag");
      if (nextState.type === "waiting_dag") {
        expect(nextState.totalNodes).toBe(2);
      }
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "execute_dag" }),
      );
    });

    test("transitions to completed on respond action", () => {
      const event: PMEvent = {
        type: "llm_result",
        content: "respond output",
        actions: [{ action: "respond", message: "Hello user" }],
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("completed");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "signal_completion" }),
      );
    });

    test("transitions to completed on complete action", () => {
      const event: PMEvent = {
        type: "llm_result",
        content: "complete output",
        actions: [{ action: "complete", summary: "All done" }],
      };
      const { nextState } = transition(thinking, event);
      expect(nextState.type).toBe("completed");
      if (nextState.type === "completed") {
        expect(nextState.summary).toBe("All done");
      }
    });

    test("handles update_prd + dispatch combo", () => {
      const event: PMEvent = {
        type: "llm_result",
        content: "prd + dispatch",
        actions: [
          { action: "update_prd", prd: { appName: "Test", description: "", targetUsers: "", features: [], dataNeeds: [], integrations: [], requiredServices: [] } },
          { action: "dispatch", target: "architect", task: "Design" },
        ],
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("waiting_single");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "send_event", data: expect.objectContaining({ prdUpdate: expect.anything() }) }),
      );
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "dispatch_agent" }),
      );
    });

    test("completes with needsUserInput when only update_prd", () => {
      const event: PMEvent = {
        type: "llm_result",
        content: "prd only",
        actions: [
          { action: "update_prd", prd: { appName: "Test", description: "", targetUsers: "", features: [], dataNeeds: [], integrations: [], requiredServices: [] } },
        ],
      };
      const { nextState } = transition(thinking, event);
      expect(nextState.type).toBe("completed");
    });

    test("transitions to completed at MAX_STEPS", () => {
      const maxState: PMState = { type: "thinking", step: MAX_STEPS };
      const event: PMEvent = {
        type: "llm_result",
        content: "over limit",
        actions: [{ action: "dispatch", target: "architect", task: "More work" }],
      };
      const { nextState } = transition(maxState, event);
      expect(nextState.type).toBe("completed");
      if (nextState.type === "completed") {
        expect(nextState.summary).toContain("Max interactions");
      }
    });

    test("ignores non-llm_result events", () => {
      const event: PMEvent = {
        type: "agent_result",
        payload: { agentRole: "architect", content: "", summary: "", blocked: false },
        from: "architect-0",
      };
      const { nextState, sideEffects } = transition(thinking, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "log_warning" }),
      );
    });
  });

  // ---- Waiting Single State ----

  describe("waiting_single state", () => {
    const waiting: PMState = {
      type: "waiting_single",
      target: "architect",
      actorId: "architect-0",
      dispatchedAt: Date.now(),
    };

    test("transitions to thinking on agent_result", () => {
      const event: PMEvent = {
        type: "agent_result",
        payload: { agentRole: "architect", content: "design output", summary: "Designed", blocked: false },
        from: "architect-0",
      };
      const { nextState, sideEffects } = transition(waiting, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "save_artifact", role: "architect" }),
      );
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "post_process" }),
      );
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "call_llm" }),
      );
    });

    test("transitions to thinking on agent_report (with discussion)", () => {
      const event: PMEvent = {
        type: "agent_report",
        payload: {
          agentRole: "developer",
          content: "code output",
          summary: "Implemented",
          discussionLog: ["dev asked arch", "arch replied"],
        },
        from: "developer-0",
      };
      const { nextState, sideEffects } = transition(waiting, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "send_event", data: expect.objectContaining({ discussionComplete: expect.anything() }) }),
      );
    });

    test("transitions to thinking on agent_error for recovery", () => {
      const event: PMEvent = {
        type: "agent_error",
        payload: { actorId: "architect-0", agentRole: "architect", error: "API timeout", errorType: "api_timeout", recoverable: true },
      };
      const { nextState, sideEffects } = transition(waiting, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "call_llm" }),
      );
    });

    test("ignores irrelevant events", () => {
      const event: PMEvent = { type: "all_parallel_collected" };
      const { nextState, sideEffects } = transition(waiting, event);
      expect(nextState.type).toBe("waiting_single");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "log_warning" }),
      );
    });
  });

  // ---- Waiting Parallel State ----

  describe("waiting_parallel state", () => {
    const waiting: PMState = {
      type: "waiting_parallel",
      groupId: "parallel-123",
      expected: 3,
      received: new Set<string>(),
    };

    test("collects parallel_result without transitioning", () => {
      const event: PMEvent = {
        type: "parallel_result",
        payload: { groupId: "parallel-123", taskId: "t1", agentRole: "developer", actorId: "developer-0", content: "ui code", summary: "Built UI", blocked: false },
      };
      const { nextState } = transition(waiting, event);
      expect(nextState.type).toBe("waiting_parallel");
      if (nextState.type === "waiting_parallel") {
        expect(nextState.received.size).toBe(1);
        expect(nextState.received.has("t1")).toBe(true);
      }
    });

    test("transitions to thinking when all results collected", () => {
      const almostDone: PMState = {
        type: "waiting_parallel",
        groupId: "parallel-123",
        expected: 2,
        received: new Set(["t1"]),
      };
      const event: PMEvent = {
        type: "parallel_result",
        payload: { groupId: "parallel-123", taskId: "t2", agentRole: "developer", actorId: "developer-1", content: "api code", summary: "Built API", blocked: false },
      };
      const { nextState, sideEffects } = transition(almostDone, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "merge_parallel" }),
      );
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "call_llm" }),
      );
    });

    test("handles parallel timeout by forcing merge", () => {
      const partial: PMState = {
        type: "waiting_parallel",
        groupId: "parallel-123",
        expected: 3,
        received: new Set(["t1"]),
      };
      const event: PMEvent = { type: "timeout", scope: "parallel" };
      const { nextState, sideEffects } = transition(partial, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "merge_parallel" }),
      );
    });

    test("counts agent_error as collected result", () => {
      const partial: PMState = {
        type: "waiting_parallel",
        groupId: "parallel-123",
        expected: 2,
        received: new Set(["t1"]),
      };
      const event: PMEvent = {
        type: "agent_error",
        payload: { actorId: "developer-1", agentRole: "developer", error: "failed", errorType: "unknown", recoverable: false },
      };
      const { nextState, sideEffects } = transition(partial, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "merge_parallel" }),
      );
    });
  });

  // ---- Waiting DAG State ----

  describe("waiting_dag state", () => {
    const waiting: PMState = {
      type: "waiting_dag",
      dagId: "dag-123",
      totalNodes: 3,
      completedNodes: new Set<string>(),
    };

    test("tracks dag_node_complete", () => {
      const event: PMEvent = { type: "dag_node_complete", nodeId: "architect-0", success: true };
      const { nextState } = transition(waiting, event);
      expect(nextState.type).toBe("waiting_dag");
      if (nextState.type === "waiting_dag") {
        expect(nextState.completedNodes.has("architect-0")).toBe(true);
      }
    });

    test("transitions to thinking on dag_complete", () => {
      const event: PMEvent = {
        type: "dag_complete",
        orchState: { status: "completed", tasks: [], parallelGroups: [], currentAgent: null, activeActors: [] },
      };
      const { nextState, sideEffects } = transition(waiting, event);
      expect(nextState.type).toBe("thinking");
      expect(sideEffects).toContainEqual(
        expect.objectContaining({ type: "call_llm" }),
      );
    });

    test("handles dag timeout", () => {
      const event: PMEvent = { type: "timeout", scope: "dag" };
      const { nextState } = transition(waiting, event);
      expect(nextState.type).toBe("error");
    });
  });

  // ---- Global Events ----

  describe("global events", () => {
    test("abort transitions any state to error", () => {
      const states: PMState[] = [
        { type: "idle" },
        { type: "thinking", step: 5 },
        { type: "waiting_single", target: "architect", actorId: "architect-0", dispatchedAt: Date.now() },
      ];
      for (const state of states) {
        const { nextState } = transition(state, { type: "abort" });
        expect(nextState.type).toBe("error");
      }
    });

    test("request timeout transitions any non-terminal state to error", () => {
      const states: PMState[] = [
        { type: "thinking", step: 3 },
        { type: "waiting_single", target: "developer", actorId: "developer-0", dispatchedAt: Date.now() },
      ];
      for (const state of states) {
        const { nextState } = transition(state, { type: "timeout", scope: "request" });
        expect(nextState.type).toBe("error");
      }
    });

    test("terminal states ignore all events", () => {
      const completed: PMState = { type: "completed", summary: "Done" };
      const errored: PMState = { type: "error", reason: "Failed" };

      const events: PMEvent[] = [
        { type: "start", payload: { task: "test" } },
        { type: "abort" },
      ];

      for (const event of events) {
        expect(transition(completed, event).nextState.type).toBe("completed");
        expect(transition(errored, event).nextState.type).toBe("error");
      }
    });
  });

  // ---- Utilities ----

  describe("utilities", () => {
    test("isTerminal identifies terminal states", () => {
      expect(isTerminal({ type: "completed", summary: "done" })).toBe(true);
      expect(isTerminal({ type: "error", reason: "fail" })).toBe(true);
      expect(isTerminal({ type: "idle" })).toBe(false);
      expect(isTerminal({ type: "thinking", step: 0 })).toBe(false);
    });

    test("describeState returns human-readable descriptions", () => {
      expect(describeState({ type: "idle" })).toBe("Idle");
      expect(describeState({ type: "thinking", step: 3 })).toBe("Thinking (step 3)");
      expect(describeState({ type: "waiting_single", target: "architect", actorId: "architect-0", dispatchedAt: 0 })).toContain("architect");
      expect(describeState({ type: "completed", summary: "All done" })).toContain("All done");
    });
  });
});
