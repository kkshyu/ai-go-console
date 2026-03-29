/**
 * DAG Executor
 *
 * Executes an agent pipeline defined as a Directed Acyclic Graph (DAG).
 * Computes topological layers and runs agents within each layer in parallel
 * using Promise.all, eliminating the N LLM roundtrips required by the
 * sequential PM decision loop.
 *
 * Features:
 * - Topological sort to compute execution layers
 * - Promise.all parallelism within each layer
 * - Blackboard-based context passing between layers
 * - Per-node retry policies (retry, skip, escalate)
 * - EventBus integration for progress tracking
 */

import type { ActorSystem } from "./actor-system";
import type { Blackboard } from "./blackboard";
import type { EventBus } from "./event-bus";
import type { Actor } from "./actor";
import type { ExecutionDAG, DAGNode, AgentRole, OrchestrationState } from "../agents/types";
import { createInitialOrchestrationState } from "../agents/types";
import { createMessage, type TaskPayload } from "./types";
import { actorLog } from "./logger";

export interface DAGExecutorConfig {
  system: ActorSystem;
  blackboard: Blackboard;
  eventBus: EventBus;
  sendEvent: (data: unknown) => Promise<void>;
  createAgent: (role: AgentRole, index: number) => Actor;
  artifactContext: string;
  fileContext?: string;
  messages: Array<{ role: string; content: string; agentRole?: string }>;
  saveArtifact: (agentRole: AgentRole, content: string, actorId?: string, taskId?: string) => Promise<void>;
  traceId?: string;
  /** The PM actor ID — task messages are sent with this as `from` so replies route back to PM */
  pmActorId: string;
}

interface NodeResult {
  nodeId: string;
  role: AgentRole;
  content: string;
  summary: string;
  success: boolean;
  error?: string;
}

export class DAGExecutor {
  private config: DAGExecutorConfig;
  private orchState: OrchestrationState;
  private nodeResults = new Map<string, NodeResult>();
  private pendingResults = new Map<string, {
    resolve: (result: NodeResult) => void;
    reject: (err: Error) => void;
  }>();
  /** Maps spawned actorId → DAG nodeId for error routing */
  private actorToNodeId = new Map<string, string>();

  constructor(config: DAGExecutorConfig) {
    this.config = config;
    this.orchState = createInitialOrchestrationState();
  }

  /**
   * Execute the DAG by processing layers in topological order.
   * Returns the final orchestration state.
   */
  async execute(dag: ExecutionDAG): Promise<OrchestrationState> {
    const { sendEvent, eventBus, traceId } = this.config;

    this.orchState = { ...this.orchState, status: "running" };

    // Compute topological layers if not provided
    const layers = dag.metadata.phases.length > 0
      ? dag.metadata.phases
      : this.computeTopologicalLayers(dag);

    actorLog("info", "dag-executor", `Executing DAG with ${layers.length} layers, ${dag.nodes.length} nodes`, traceId);

    await sendEvent({
      dagExecution: {
        totalLayers: layers.length,
        totalNodes: dag.nodes.length,
        parallelismDegree: dag.metadata.parallelismDegree,
      },
    });

    // Execute each layer sequentially, agents within each layer in parallel
    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layerNodeIds = layers[layerIdx];
      const layerNodes = layerNodeIds
        .map((id) => dag.nodes.find((n) => n.id === id))
        .filter((n): n is DAGNode => n !== undefined);

      if (layerNodes.length === 0) continue;

      actorLog(
        "info",
        "dag-executor",
        `Layer ${layerIdx}: [${layerNodes.map((n) => `${n.role}(${n.id})`).join(", ")}]`,
        traceId,
      );

      await sendEvent({
        dagLayer: {
          layer: layerIdx,
          agents: layerNodes.map((n) => ({ id: n.id, role: n.role })),
        },
      });

      // Execute all nodes in this layer in parallel
      const results = await Promise.all(
        layerNodes.map((node) => this.executeNode(node)),
      );

      // Process results
      for (const result of results) {
        this.nodeResults.set(result.nodeId, result);

        // Write result to blackboard
        this.config.blackboard.set(
          `${result.role}_output`,
          result.content,
          result.nodeId,
        );

        // Publish completion event
        await eventBus.publish(
          `${result.role}_complete`,
          { nodeId: result.nodeId, success: result.success, summary: result.summary },
          result.nodeId,
        );

        // Update orchestration state
        this.orchState = {
          ...this.orchState,
          tasks: [
            ...this.orchState.tasks,
            {
              agentRole: result.role,
              actorId: result.nodeId,
              status: result.success ? "completed" : "error",
              description: result.summary,
              summary: result.summary,
            },
          ],
        };

        if (!result.success) {
          const node = layerNodes.find((n) => n.id === result.nodeId);
          await this.handleNodeFailure(node!, result);
        }
      }

      await sendEvent({
        dagLayerComplete: {
          layer: layerIdx,
          results: results.map((r) => ({
            nodeId: r.nodeId,
            role: r.role,
            success: r.success,
          })),
        },
      });
    }

    this.orchState = { ...this.orchState, status: "completed" };
    return this.orchState;
  }

  /**
   * Build upstream context for a node, including structured error information
   * from any failed dependencies so downstream agents can adapt their work.
   */
  private buildNodeContext(node: DAGNode): string {
    const contextParts: string[] = [];

    for (const depId of node.dependsOn) {
      const depResult = this.nodeResults.get(depId);
      if (!depResult) continue;

      if (depResult.success) {
        contextParts.push(`[${depResult.role.toUpperCase()} (${depResult.nodeId})]: ${depResult.summary}`);
      } else {
        contextParts.push(
          `[${depResult.role.toUpperCase()} (${depResult.nodeId}) — FAILED]: ${depResult.error || "Unknown error"}. Adapt your work accordingly — skip features that depend on this agent's output.`,
        );
      }
    }

    return contextParts.join("\n");
  }

  /**
   * Execute a single DAG node by spawning an agent and waiting for its result.
   */
  private async executeNode(node: DAGNode): Promise<NodeResult> {
    const { system, sendEvent, blackboard, traceId } = this.config;

    try {
      // Build context from blackboard (results of dependent nodes)
      const contextKeys = node.dependsOn
        .map((depId) => {
          const depResult = this.nodeResults.get(depId);
          return depResult ? `${depResult.role}_output` : null;
        })
        .filter((k): k is string => k !== null);

      const bbContext = blackboard.buildContext(contextKeys);

      // Build upstream dependency context with error propagation
      const upstreamContext = this.buildNodeContext(node);

      // Create and spawn the agent
      const index = parseInt(node.id.split("-").pop() || "0", 10);
      const agent = this.config.createAgent(node.role, index);
      await system.spawn(agent);

      // Track actorId → nodeId mapping for error routing
      this.actorToNodeId.set(agent.id, node.id);

      // Send agent metadata event
      await sendEvent({
        agentRole: node.role,
        orchestrationState: this.orchState,
      });

      // Create a promise that resolves when the agent completes
      const resultPromise = new Promise<NodeResult>((resolve, reject) => {
        // Set up a timeout
        const timeout = node.timeout || 120_000;
        const timer = setTimeout(() => {
          reject(new Error(`Node ${node.id} timed out after ${timeout}ms`));
        }, timeout);

        this.pendingResults.set(node.id, {
          resolve: (result) => {
            clearTimeout(timer);
            resolve(result);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });
      });

      // Send task to agent — use pmActorId as `from` so replies route back to PM
      const fullContext = [this.config.artifactContext, bbContext, upstreamContext, this.config.fileContext]
        .filter(Boolean)
        .join("\n\n");

      const taskMsg = createMessage("task", this.config.pmActorId, agent.id, {
        task: node.task,
        context: fullContext,
        messages: this.config.messages,
        dagNodeId: node.id,
      } satisfies TaskPayload, traceId);

      system.send(taskMsg);

      // Wait for result
      return await resultPromise;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      actorLog("error", "dag-executor", `Node ${node.id} failed: ${errMsg}`, traceId);

      return {
        nodeId: node.id,
        role: node.role,
        content: "",
        summary: `Failed: ${errMsg}`,
        success: false,
        error: errMsg,
      };
    }
  }

  /**
   * Handle a node failure based on its retry policy.
   */
  private async handleNodeFailure(node: DAGNode, result: NodeResult): Promise<void> {
    const policy = node.retryPolicy || { maxRetries: 0, strategy: "skip" as const };

    switch (policy.strategy) {
      case "retry":
        if (policy.maxRetries > 0) {
          actorLog("info", "dag-executor", `Retrying node ${node.id} (${policy.maxRetries} retries left)`, this.config.traceId);
          const retryNode = { ...node, retryPolicy: { ...policy, maxRetries: policy.maxRetries - 1 } };
          const retryResult = await this.executeNode(retryNode);
          this.nodeResults.set(retryResult.nodeId, retryResult);
        }
        break;
      case "escalate":
        await this.config.sendEvent({
          dagEscalation: {
            nodeId: node.id,
            role: node.role,
            error: result.error,
          },
        });
        break;
      case "skip":
      default:
        actorLog("warn", "dag-executor", `Node ${node.id} failed — error context will propagate to downstream dependents`, this.config.traceId);
        break;
    }
  }

  /**
   * Called when an agent completes its task. Resolves the pending promise
   * for the corresponding DAG node.
   */
  notifyNodeComplete(nodeId: string, content: string, summary: string, success: boolean): void {
    const pending = this.pendingResults.get(nodeId);
    if (pending) {
      pending.resolve({
        nodeId,
        role: this.getNodeRole(nodeId),
        content,
        summary,
        success,
      });
      this.pendingResults.delete(nodeId);
    }
  }

  /**
   * Called when an agent fails. Rejects the pending promise.
   */
  notifyNodeError(nodeId: string, error: string): void {
    const pending = this.pendingResults.get(nodeId);
    if (pending) {
      pending.reject(new Error(error));
      this.pendingResults.delete(nodeId);
    }
  }

  /**
   * Compute topological layers from DAG nodes.
   * Each layer contains nodes whose dependencies are all in earlier layers.
   */
  private computeTopologicalLayers(dag: ExecutionDAG): string[][] {
    const layers: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(dag.nodes.map((n) => n.id));

    while (remaining.size > 0) {
      const layer: string[] = [];

      for (const nodeId of remaining) {
        const node = dag.nodes.find((n) => n.id === nodeId)!;
        const depsResolved = node.dependsOn.every((dep) => completed.has(dep));
        if (depsResolved) {
          layer.push(nodeId);
        }
      }

      if (layer.length === 0) {
        // Circular dependency detected — break with remaining nodes
        actorLog("error", "dag-executor", `Circular dependency detected: ${Array.from(remaining).join(", ")}`, this.config.traceId);
        layers.push(Array.from(remaining));
        break;
      }

      for (const id of layer) {
        remaining.delete(id);
        completed.add(id);
      }

      layers.push(layer);
    }

    return layers;
  }

  /** Helper to get a node's role from the pending results. */
  private getNodeRole(nodeId: string): AgentRole {
    // Extract role from node ID format "role-index"
    const parts = nodeId.split("-");
    parts.pop(); // remove index
    return parts.join("-") as AgentRole;
  }

  /** Get the current orchestration state. */
  getOrchestrationState(): OrchestrationState {
    return this.orchState;
  }

  /** Resolve an actor ID to its DAG node ID (for error routing from PM). */
  resolveNodeId(actorId: string): string | undefined {
    return this.actorToNodeId.get(actorId);
  }

  /** Get all actor IDs spawned by this DAG executor. */
  getSpawnedActorIds(): Set<string> {
    return new Set(this.actorToNodeId.keys());
  }
}
