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
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { AGENT_DEFINITIONS } from "@/lib/agents/types";

const ROLE_ICONS: Record<AgentRole, React.ComponentType<{ className?: string }>> = {
  pm: ClipboardList,
  architect: Blocks,
  developer: Code2,
  reviewer: ShieldCheck,
  devops: Rocket,
};

type AgentPhase = "thinking" | "translating" | "progress" | null;

interface AgentProgressProps {
  state: OrchestrationState;
  currentAgent?: AgentRole | null;
  isLoading?: boolean;
  agentPhase?: AgentPhase;
  statusMessage?: string;
  generatingText?: string;
}

/**
 * Displays dispatched agent tasks dynamically with inline status text.
 * Only shows agents that PM has actually dispatched (not a fixed 5-stage bar).
 * Includes real-time status for the currently active agent.
 */
export function PipelineProgress({
  state,
  currentAgent,
  isLoading,
  agentPhase,
  statusMessage,
  generatingText = "Generating...",
}: AgentProgressProps) {
  if (state.tasks.length === 0 && !state.currentAgent) {
    return null;
  }

  // Collect unique agents to show: tasks + current PM if running
  const items: { role: AgentRole; isActive: boolean; isCompleted: boolean; summary?: string }[] = [];

  // If PM is currently active and no tasks yet, show PM
  if (state.currentAgent === "pm" && state.tasks.length === 0) {
    items.push({ role: "pm", isActive: true, isCompleted: false });
  }

  for (const task of state.tasks) {
    items.push({
      role: task.agentRole,
      isActive: task.status === "running",
      isCompleted: task.status === "completed",
      summary: task.description || task.summary,
    });
  }

  // Determine the active status text for currently running non-PM agent
  const activeNonPmAgent = currentAgent && currentAgent !== "pm" ? currentAgent : null;
  const showActiveStatus = isLoading && activeNonPmAgent;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-muted/50">
      {/* Agent pipeline row */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {items.map((item, index) => {
          const Icon = ROLE_ICONS[item.role];
          const agent = AGENT_DEFINITIONS[item.role];

          return (
            <div key={`${item.role}-${index}`} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-4 h-px mx-0.5 ${
                    item.isCompleted ? "bg-green-400" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-all ${
                  item.isActive
                    ? `bg-background shadow-sm ring-1 ring-border ${agent.color}`
                    : item.isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }`}
                title={item.summary || agent.description}
              >
                {item.isCompleted ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : item.isActive ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                ) : (
                  <Icon className="h-3 w-3 shrink-0" />
                )}
                <span className="hidden sm:inline">{agent.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Minimal active indicator — detailed status shown as PM chat bubble */}
      {isLoading && currentAgent && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>{AGENT_DEFINITIONS[currentAgent]?.label} ...</span>
        </div>
      )}
    </div>
  );
}
