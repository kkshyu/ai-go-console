import { describe, test, expect, vi } from "vitest";
import { DAGExecutor, type DAGExecutorConfig } from "../dag-executor";
import { Blackboard } from "../blackboard";
import { EventBus } from "../event-bus";
import type { ExecutionDAG, DAGNode } from "../../agents/types";
import type { Actor } from "../actor";
import type { ActorSystem } from "../actor-system";

/**
 * Create a minimal mock ActorSystem that records spawn/send calls.
 */
function createMockActorSystem() {
  return {
    spawn: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
  } as unknown as ActorSystem;
}

/**
 * Create a minimal mock Actor.
 */
function createMockActor(id: string): Actor {
  return { id } as unknown as Actor;
}

/**
 * Build a DAGExecutorConfig with all mocks wired up.
 */
function createTestConfig(overrides?: Partial<DAGExecutorConfig>): DAGExecutorConfig {
  return {
    system: createMockActorSystem(),
    blackboard: new Blackboard(),
    eventBus: new EventBus(),
    sendEvent: vi.fn().mockResolvedValue(undefined),
    createAgent: vi.fn((_role, _index) => createMockActor(`${_role}-${_index}`)),
    artifactContext: "",
    messages: [],
    saveArtifact: vi.fn().mockResolvedValue(undefined),
    traceId: "test-trace",
    pmActorId: "pm-0",
    ...overrides,
  };
}

/**
 * Helper to build a DAG with pre-computed phases.
 */
function buildDAG(nodes: DAGNode[], phases: string[][]): ExecutionDAG {
  return {
    nodes,
    metadata: {
      phases,
      parallelismDegree: Math.max(...phases.map((p) => p.length), 1),
      estimatedDuration: 1000,
    },
  };
}

describe("DAGExecutor", () => {
  describe("execute with pre-computed phases", () => {
    test("linear chain produces sequential execution", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [
          { id: "architect-0", role: "architect", task: "Design", dependsOn: [] },
          { id: "developer-0", role: "developer", task: "Code", dependsOn: ["architect-0"] },
          { id: "reviewer-0", role: "reviewer", task: "Review", dependsOn: ["developer-0"] },
        ],
        [["architect-0"], ["developer-0"], ["reviewer-0"]],
      );

      // Start execution, then notify each node as it resolves
      const execPromise = executor.execute(dag);

      // Wait for first agent spawn, then notify completion
      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("architect", 0);
      });
      executor.notifyNodeComplete("architect-0", '{"design": "done"}', "Designed", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("developer", 0);
      });
      executor.notifyNodeComplete("developer-0", '{"code": "done"}', "Coded", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("reviewer", 0);
      });
      executor.notifyNodeComplete("reviewer-0", '{"review": "ok"}', "Reviewed", true);

      const state = await execPromise;
      expect(state.status).toBe("completed");
      expect(state.tasks).toHaveLength(3);
      expect(state.tasks.every((t) => t.status === "completed")).toBe(true);
    });

    test("parallel independent nodes execute in same layer", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [
          { id: "developer-0", role: "developer", task: "Build UI", dependsOn: [] },
          { id: "developer-1", role: "developer", task: "Build API", dependsOn: [] },
        ],
        [["developer-0", "developer-1"]],
      );

      const execPromise = executor.execute(dag);

      // Both should be spawned in the same layer
      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledTimes(2);
      });
      executor.notifyNodeComplete("developer-0", "UI done", "UI done", true);
      executor.notifyNodeComplete("developer-1", "API done", "API done", true);

      const state = await execPromise;
      expect(state.status).toBe("completed");
      expect(state.tasks).toHaveLength(2);
    });

    test("diamond dependency graph executes correctly", async () => {
      // A -> B, C (parallel) -> D
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [
          { id: "architect-0", role: "architect", task: "Design", dependsOn: [] },
          { id: "developer-0", role: "developer", task: "Frontend", dependsOn: ["architect-0"] },
          { id: "developer-1", role: "developer", task: "Backend", dependsOn: ["architect-0"] },
          { id: "reviewer-0", role: "reviewer", task: "Review all", dependsOn: ["developer-0", "developer-1"] },
        ],
        [["architect-0"], ["developer-0", "developer-1"], ["reviewer-0"]],
      );

      const execPromise = executor.execute(dag);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("architect", 0);
      });
      executor.notifyNodeComplete("architect-0", "design", "Designed", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("developer", 0);
        expect(config.createAgent).toHaveBeenCalledWith("developer", 1);
      });
      executor.notifyNodeComplete("developer-0", "frontend", "Frontend done", true);
      executor.notifyNodeComplete("developer-1", "backend", "Backend done", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("reviewer", 0);
      });
      executor.notifyNodeComplete("reviewer-0", "review", "Reviewed", true);

      const state = await execPromise;
      expect(state.status).toBe("completed");
      expect(state.tasks).toHaveLength(4);
    });
  });

  describe("execute with auto-computed topological layers", () => {
    test("computes layers from dependencies", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      // No pre-computed phases — force computeTopologicalLayers
      const dag: ExecutionDAG = {
        nodes: [
          { id: "architect-0", role: "architect", task: "Design", dependsOn: [] },
          { id: "developer-0", role: "developer", task: "Code", dependsOn: ["architect-0"] },
        ],
        metadata: {
          phases: [], // empty = auto-compute
          parallelismDegree: 1,
          estimatedDuration: 1000,
        },
      };

      const execPromise = executor.execute(dag);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("architect", 0);
      });
      executor.notifyNodeComplete("architect-0", "design", "Designed", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledWith("developer", 0);
      });
      executor.notifyNodeComplete("developer-0", "code", "Coded", true);

      const state = await execPromise;
      expect(state.status).toBe("completed");
      expect(state.tasks).toHaveLength(2);
    });

    test("independent nodes land in same computed layer", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag: ExecutionDAG = {
        nodes: [
          { id: "developer-0", role: "developer", task: "A", dependsOn: [] },
          { id: "developer-1", role: "developer", task: "B", dependsOn: [] },
          { id: "reviewer-0", role: "reviewer", task: "Review", dependsOn: ["developer-0", "developer-1"] },
        ],
        metadata: {
          phases: [],
          parallelismDegree: 2,
          estimatedDuration: 1000,
        },
      };

      const execPromise = executor.execute(dag);

      // Both developers should be in layer 0 (spawned together)
      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledTimes(2);
      });
      executor.notifyNodeComplete("developer-0", "a", "A done", true);
      executor.notifyNodeComplete("developer-1", "b", "B done", true);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalledTimes(3);
      });
      executor.notifyNodeComplete("reviewer-0", "review", "Reviewed", true);

      const state = await execPromise;
      expect(state.status).toBe("completed");
      expect(state.tasks).toHaveLength(3);
    });
  });

  describe("notifyNodeComplete / notifyNodeError", () => {
    test("notifyNodeComplete resolves pending node", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [{ id: "architect-0", role: "architect", task: "Design", dependsOn: [] }],
        [["architect-0"]],
      );

      const execPromise = executor.execute(dag);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalled();
      });
      executor.notifyNodeComplete("architect-0", "result", "Done", true);

      const state = await execPromise;
      expect(state.tasks[0].status).toBe("completed");
    });

    test("notifyNodeError causes node failure", async () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [{ id: "architect-0", role: "architect", task: "Design", dependsOn: [] }],
        [["architect-0"]],
      );

      const execPromise = executor.execute(dag);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalled();
      });
      executor.notifyNodeError("architect-0", "LLM timeout");

      const state = await execPromise;
      expect(state.tasks[0].status).toBe("error");
    });
  });

  describe("blackboard context passing", () => {
    test("writes node results to blackboard", async () => {
      const blackboard = new Blackboard();
      const config = createTestConfig({ blackboard });
      const executor = new DAGExecutor(config);

      const dag = buildDAG(
        [{ id: "architect-0", role: "architect", task: "Design", dependsOn: [] }],
        [["architect-0"]],
      );

      const execPromise = executor.execute(dag);

      await vi.waitFor(() => {
        expect(config.createAgent).toHaveBeenCalled();
      });
      executor.notifyNodeComplete("architect-0", '{"arch": "microservices"}', "Designed", true);

      await execPromise;
      expect(blackboard.get("architect_output")).toBe('{"arch": "microservices"}');
    });
  });

  describe("getOrchestrationState", () => {
    test("returns initial idle state before execution", () => {
      const config = createTestConfig();
      const executor = new DAGExecutor(config);
      const state = executor.getOrchestrationState();
      expect(state.status).toBe("idle");
      expect(state.tasks).toEqual([]);
    });
  });
});
