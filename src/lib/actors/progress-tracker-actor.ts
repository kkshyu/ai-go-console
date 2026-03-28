/**
 * Progress Tracker Background Actor
 *
 * Non-LLM background actor that aggregates pipeline progress
 * across all agents. Provides a single source of truth for
 * pipeline status, replacing scattered progress messages.
 *
 * Communication patterns:
 * - fireAndForget(): receive agent status updates
 * - request(): query current pipeline progress
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage } from "./types";
import type { BackgroundAgentRole, AgentRole } from "../agents/types";

interface AgentStatusUpdate {
  agentRole: AgentRole;
  actorId: string;
  status: "started" | "running" | "completed" | "error";
  message?: string;
  layer?: number;
}

interface PipelineProgress {
  totalAgents: number;
  completedAgents: number;
  activeAgents: Array<{ role: AgentRole; actorId: string; startedAt: number }>;
  completedList: Array<{ role: AgentRole; actorId: string; completedAt: number; success: boolean }>;
  currentLayer: number;
  totalLayers: number;
  overallPercentage: number;
  estimatedTimeRemaining: number | null;
  startedAt: number;
}

export class ProgressTrackerActor extends BackgroundActor {
  private progress: PipelineProgress = {
    totalAgents: 0,
    completedAgents: 0,
    activeAgents: [],
    completedList: [],
    currentLayer: 0,
    totalLayers: 0,
    overallPercentage: 0,
    estimatedTimeRemaining: null,
    startedAt: Date.now(),
  };

  constructor(id: string) {
    super(id, "progress_tracker" as BackgroundAgentRole);
  }

  async process(message: BackgroundMessage): Promise<unknown> {
    switch (message.type) {
      case "progress_update" as BackgroundMessage["type"]:
        return this.handleUpdate(message.payload as AgentStatusUpdate);
      case "progress_query" as BackgroundMessage["type"]:
        return this.getProgress();
      case "progress_init" as BackgroundMessage["type"]:
        return this.initPipeline(message.payload as { totalAgents: number; totalLayers: number });
      default:
        return this.getProgress();
    }
  }

  private initPipeline(init: { totalAgents: number; totalLayers: number }): PipelineProgress {
    this.progress = {
      totalAgents: init.totalAgents,
      completedAgents: 0,
      activeAgents: [],
      completedList: [],
      currentLayer: 0,
      totalLayers: init.totalLayers,
      overallPercentage: 0,
      estimatedTimeRemaining: null,
      startedAt: Date.now(),
    };
    return this.progress;
  }

  private handleUpdate(update: AgentStatusUpdate): PipelineProgress {
    const now = Date.now();

    switch (update.status) {
      case "started":
      case "running":
        // Add to active agents (if not already there)
        if (!this.progress.activeAgents.some((a) => a.actorId === update.actorId)) {
          this.progress.activeAgents.push({
            role: update.agentRole,
            actorId: update.actorId,
            startedAt: now,
          });
        }
        if (update.layer !== undefined) {
          this.progress.currentLayer = update.layer;
        }
        break;

      case "completed":
        // Move from active to completed
        this.progress.activeAgents = this.progress.activeAgents.filter(
          (a) => a.actorId !== update.actorId,
        );
        this.progress.completedList.push({
          role: update.agentRole,
          actorId: update.actorId,
          completedAt: now,
          success: true,
        });
        this.progress.completedAgents++;
        break;

      case "error":
        // Move from active to completed (with error)
        this.progress.activeAgents = this.progress.activeAgents.filter(
          (a) => a.actorId !== update.actorId,
        );
        this.progress.completedList.push({
          role: update.agentRole,
          actorId: update.actorId,
          completedAt: now,
          success: false,
        });
        this.progress.completedAgents++;
        break;
    }

    // Update percentage
    if (this.progress.totalAgents > 0) {
      this.progress.overallPercentage = Math.round(
        (this.progress.completedAgents / this.progress.totalAgents) * 100,
      );
    }

    // Estimate remaining time
    if (this.progress.completedAgents > 0) {
      const elapsed = now - this.progress.startedAt;
      const avgTimePerAgent = elapsed / this.progress.completedAgents;
      const remaining = this.progress.totalAgents - this.progress.completedAgents;
      this.progress.estimatedTimeRemaining = Math.round(avgTimePerAgent * remaining);
    }

    return this.progress;
  }

  private getProgress(): PipelineProgress {
    return { ...this.progress };
  }
}
