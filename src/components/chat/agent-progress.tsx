"use client";

import { useTranslations } from "next-intl";
import { Loader2, ChevronRight } from "lucide-react";
import type { AgentRole, OrchestrationState, AgentTask } from "@/lib/agents/types";

type AgentPhase = "thinking" | "translating" | "progress" | null;

export interface ActorStatusInfo {
  actorId: string;
  role: string;
  status: string;
  restartCount?: number;
}

/** Sub-task info dispatched by senior agents */
export interface SubTaskInfo {
  parentActorId: string;
  actorId: string;
  subTaskId: string;
  agentRole: string;
  tier: string;
  description: string;
  status: "running" | "completed";
  summary?: string;
}

/** Senior plan info for UI display */
export interface SeniorPlanInfo {
  agentRole: string;
  strategy: string;
  subTaskCount: number;
  tiers: { junior: number; intermediate: number };
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
  /** Active sub-tasks from senior agents */
  subTasks?: SubTaskInfo[];
  /** Active senior plans */
  seniorPlans?: SeniorPlanInfo[];
}

/** Tier badge styling */
function tierBadge(tier: string): string {
  switch (tier) {
    case "junior": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "intermediate": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "senior": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    default: return "bg-muted text-muted-foreground";
  }
}

/**
 * Displays agent progress with support for senior/junior hierarchy.
 * Shows nested sub-task tree when senior agents delegate to juniors.
 */
export function AgentProgress({
  state: _state,
  currentAgent,
  isLoading,
  agentPhase,
  statusMessage,
  generatingText,
  subTasks,
  seniorPlans,
}: AgentProgressProps) {
  const t = useTranslations("chat");
  const tAgents = useTranslations("agents");
  const resolvedGeneratingText = generatingText ?? t("generating");

  if (!isLoading) {
    return null;
  }

  // Determine status text
  let text = "";
  if (agentPhase === "progress" && statusMessage) {
    text = statusMessage;
  } else if (currentAgent && currentAgent !== "pm") {
    const label = tAgents(`roles.${currentAgent}`);
    text = agentPhase === "translating" ? `${label} ...` : `${label} ${resolvedGeneratingText}`;
  } else if (currentAgent === "pm") {
    text = statusMessage || `${tAgents("roles.pm")} ${resolvedGeneratingText}`;
  }

  // Group sub-tasks by parent actor
  const subTasksByParent = new Map<string, SubTaskInfo[]>();
  if (subTasks && subTasks.length > 0) {
    for (const st of subTasks) {
      const list = subTasksByParent.get(st.parentActorId) || [];
      list.push(st);
      subTasksByParent.set(st.parentActorId, list);
    }
  }

  const hasSubTasks = subTasksByParent.size > 0;
  const hasPlans = seniorPlans && seniorPlans.length > 0;

  return (
    <div className="space-y-1">
      {/* Main status line */}
      {text && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>{text}</span>
        </div>
      )}

      {/* Senior plan summaries */}
      {hasPlans && seniorPlans!.map((plan, i) => (
        <div key={`plan-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-50/50 dark:bg-purple-900/10 text-xs text-muted-foreground">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${tierBadge("senior")}`}>
            Senior
          </span>
          <span className="truncate">{plan.strategy.slice(0, 80)}</span>
          <span className="ml-auto shrink-0 text-[10px]">
            {plan.subTaskCount} sub-tasks
          </span>
        </div>
      ))}

      {/* Sub-task tree */}
      {hasSubTasks && Array.from(subTasksByParent.entries()).map(([parentId, tasks]) => (
        <div key={parentId} className="ml-4 space-y-0.5">
          {tasks.map((st) => (
            <div
              key={st.subTaskId}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-muted-foreground"
            >
              <ChevronRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
              <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium ${tierBadge(st.tier)}`}>
                {st.tier === "intermediate" ? "Mid" : st.tier === "junior" ? "Jr" : "Sr"}
              </span>
              {st.status === "running" ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
              ) : (
                <span className="text-green-500 shrink-0">✓</span>
              )}
              <span className="truncate">{st.description}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
