"use client";

import { useTranslations } from "next-intl";
import {
  ClipboardList,
  Blocks,
  Code2,
  ShieldCheck,
  Rocket,
  Check,
  Loader2,
  GitBranch,
  GitMerge,
  RefreshCw,
  Heart,
} from "lucide-react";
import type { AgentRole, OrchestrationState, ParallelTaskGroup } from "@/lib/agents/types";
import { AGENT_DEFINITIONS } from "@/lib/agents/types";

const ROLE_ICONS: Record<AgentRole, React.ComponentType<{ className?: string }>> = {
  pm: ClipboardList,
  architect: Blocks,
  developer: Code2,
  reviewer: ShieldCheck,
  devops: Rocket,
};

type AgentPhase = "thinking" | "translating" | "progress" | null;

export interface ActorStatusInfo {
  actorId: string;
  role: AgentRole;
  status: "idle" | "processing" | "waiting" | "dead" | "restarting";
  restartCount?: number;
}

interface AgentProgressProps {
  state: OrchestrationState;
  currentAgent?: AgentRole | null;
  isLoading?: boolean;
  agentPhase?: AgentPhase;
  statusMessage?: string;
  generatingText?: string;
  actorStatuses?: ActorStatusInfo[];
  restartEvent?: { actorId: string; role: string; restartCount: number } | null;
}

/**
 * Displays dispatched agent tasks dynamically with inline status text.
 * Supports parallel developer groups (shown as branching pipeline)
 * and actor heartbeat/restart status.
 */
export function PipelineProgress({
  state,
  currentAgent,
  isLoading,
  agentPhase,
  statusMessage,
  generatingText,
  actorStatuses = [],
  restartEvent,
}: AgentProgressProps) {
  const t = useTranslations("chat");
  const resolvedGeneratingText = generatingText ?? t("generating");

  const hasParallelGroups = state.parallelGroups && state.parallelGroups.length > 0;

  if (state.tasks.length === 0 && !state.currentAgent && !hasParallelGroups) {
    return null;
  }

  // Collect sequential items (non-parallel tasks)
  const items: { role: AgentRole; actorId?: string; isActive: boolean; isCompleted: boolean; summary?: string }[] = [];

  // If PM is currently active and no tasks yet, show PM
  if (state.currentAgent === "pm" && state.tasks.length === 0) {
    items.push({ role: "pm", isActive: true, isCompleted: false });
  }

  for (const task of state.tasks) {
    // Skip developer tasks that are part of a parallel group
    if (task.actorId && hasParallelGroups) {
      const isInParallelGroup = state.parallelGroups!.some((g) =>
        g.tasks.some((t) => t.actorId === task.actorId)
      );
      if (isInParallelGroup) continue;
    }

    items.push({
      role: task.agentRole,
      actorId: task.actorId,
      isActive: task.status === "running",
      isCompleted: task.status === "completed",
      summary: task.description || task.summary,
    });
  }

  // Determine the active status text
  const activeNonPmAgent = currentAgent && currentAgent !== "pm" ? currentAgent : null;
  const showActiveStatus = isLoading && activeNonPmAgent;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-muted/50">
      {/* Sequential agent pipeline row */}
      <div className="flex items-center gap-1 overflow-x-auto flex-wrap">
        {items.map((item, index) => (
          <AgentPipelineItem
            key={`${item.role}-${item.actorId || index}`}
            item={item}
            index={index}
          />
        ))}

        {/* Parallel developer groups */}
        {hasParallelGroups &&
          state.parallelGroups!.map((group) => (
            <ParallelGroupDisplay key={group.groupId} group={group} />
          ))}
      </div>

      {/* Active agent status text */}
      {showActiveStatus && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>
            {agentPhase === "progress" && statusMessage
              ? statusMessage
              : `${AGENT_DEFINITIONS[activeNonPmAgent]?.label}${
                  agentPhase === "translating" ? " ..." : ` ${resolvedGeneratingText}`
                }`}
          </span>
        </div>
      )}

      {/* PM thinking status */}
      {isLoading && currentAgent === "pm" && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>
            {agentPhase === "progress" && statusMessage
              ? statusMessage
              : `PM ${resolvedGeneratingText}`}
          </span>
        </div>
      )}

      {/* Actor status bar */}
      {actorStatuses.length > 0 && (
        <div className="flex items-center gap-2 px-1 pt-1 border-t border-border/50">
          <Heart className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {actorStatuses.map((actor) => (
              <ActorStatusBadge key={actor.actorId} actor={actor} />
            ))}
          </div>
        </div>
      )}

      {/* Restart notification */}
      {restartEvent && (
        <div className="flex items-center gap-2 px-1 text-xs text-amber-600 dark:text-amber-400">
          <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
          <span>
            {AGENT_DEFINITIONS[restartEvent.role as AgentRole]?.label || restartEvent.role} 重新啟動中
            (#{restartEvent.restartCount})
          </span>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function AgentPipelineItem({
  item,
  index,
}: {
  item: { role: AgentRole; actorId?: string; isActive: boolean; isCompleted: boolean; summary?: string };
  index: number;
}) {
  const Icon = ROLE_ICONS[item.role];
  const agent = AGENT_DEFINITIONS[item.role];

  return (
    <div className="flex items-center">
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
        <span className="hidden sm:inline">
          {agent.label}
          {item.actorId && item.actorId !== `${item.role}-0` && (
            <span className="text-[10px] ml-0.5 opacity-60">
              #{item.actorId.split("-").pop()}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function ParallelGroupDisplay({ group }: { group: ParallelTaskGroup }) {
  const isActive = group.status === "running";
  const isCompleted = group.status === "completed";

  return (
    <div className="flex items-center">
      {/* Fork connector */}
      <div className="flex items-center mx-0.5">
        <div className={`w-2 h-px ${isCompleted ? "bg-green-400" : "bg-border"}`} />
        <GitBranch className={`h-3 w-3 ${isCompleted ? "text-green-400" : "text-muted-foreground"}`} />
      </div>

      {/* Parallel developer stack */}
      <div className="flex flex-col gap-0.5">
        {group.tasks.map((task) => {
          const agent = AGENT_DEFINITIONS[task.agentRole];
          const Icon = ROLE_ICONS[task.agentRole];
          const taskIsActive = task.status === "running";
          const taskIsCompleted = task.status === "completed";

          return (
            <div
              key={task.actorId || task.description}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs whitespace-nowrap transition-all ${
                taskIsActive
                  ? `bg-background shadow-sm ring-1 ring-border ${agent.color}`
                  : taskIsCompleted
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
              }`}
              title={task.description || task.summary}
            >
              {taskIsCompleted ? (
                <Check className="h-2.5 w-2.5 shrink-0" />
              ) : taskIsActive ? (
                <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
              ) : (
                <Icon className="h-2.5 w-2.5 shrink-0" />
              )}
              <span>
                {agent.label}
                {task.actorId && (
                  <span className="text-[10px] ml-0.5 opacity-60">
                    #{task.actorId.split("-").pop()}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Merge connector */}
      <div className="flex items-center mx-0.5">
        <GitMerge className={`h-3 w-3 ${isCompleted ? "text-green-400" : "text-muted-foreground"}`} />
        <div className={`w-2 h-px ${isCompleted ? "bg-green-400" : "bg-border"}`} />
      </div>
    </div>
  );
}

function ActorStatusBadge({ actor }: { actor: ActorStatusInfo }) {
  const agent = AGENT_DEFINITIONS[actor.role];
  const statusColors: Record<string, string> = {
    idle: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    waiting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    dead: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    restarting: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  };

  const statusLabels: Record<string, string> = {
    idle: "待命",
    processing: "處理中",
    waiting: "等待中",
    dead: "已停止",
    restarting: "重啟中",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[actor.status] || statusColors.idle}`}
      title={`${actor.actorId}: ${actor.status}${actor.restartCount ? ` (重啟 ${actor.restartCount} 次)` : ""}`}
    >
      {actor.status === "processing" && (
        <Loader2 className="h-2 w-2 animate-spin" />
      )}
      {actor.status === "restarting" && (
        <RefreshCw className="h-2 w-2 animate-spin" />
      )}
      <span>{agent?.label || actor.role}</span>
      {actor.actorId.includes("-") && (
        <span className="opacity-60">#{actor.actorId.split("-").pop()}</span>
      )}
      <span className="opacity-70">{statusLabels[actor.status]}</span>
    </span>
  );
}
