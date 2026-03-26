"use client";

import {
  ClipboardList,
  Blocks,
  Code2,
  ShieldCheck,
  Rocket,
  Check,
  Loader2,
} from "lucide-react";
import type { PipelineStage, PipelineState } from "@/lib/agents/types";
import { PIPELINE_STAGES, STAGE_AGENT_MAP, AGENT_DEFINITIONS } from "@/lib/agents/types";

const STAGE_ICONS: Record<PipelineStage, React.ComponentType<{ className?: string }>> = {
  requirements: ClipboardList,
  architecture: Blocks,
  coding: Code2,
  review: ShieldCheck,
  deployment: Rocket,
};

interface PipelineProgressProps {
  state: PipelineState;
  labels: Record<PipelineStage, string>;
}

export function PipelineProgress({ state, labels }: PipelineProgressProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted/50 overflow-x-auto">
      {PIPELINE_STAGES.map((stage, index) => {
        const Icon = STAGE_ICONS[stage];
        const agentRole = STAGE_AGENT_MAP[stage];
        const agent = AGENT_DEFINITIONS[agentRole];
        const stageState = state.stages[stage];
        const isActive = state.currentStage === stage;
        const isCompleted = stageState.status === "completed";
        const isRunning = stageState.status === "running";

        return (
          <div key={stage} className="flex items-center">
            {index > 0 && (
              <div
                className={`w-4 h-px mx-0.5 ${
                  isCompleted ? "bg-green-400" : "bg-border"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-all ${
                isActive
                  ? `bg-background shadow-sm ring-1 ring-border ${agent.color}`
                  : isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
              }`}
              title={labels[stage]}
            >
              {isCompleted ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : isRunning ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : (
                <Icon className="h-3 w-3 shrink-0" />
              )}
              <span className="hidden sm:inline">{labels[stage]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
