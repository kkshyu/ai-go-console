"use client";

import { useTranslations } from "next-intl";
import {
  ClipboardList,
  Blocks,
  Code2,
  ShieldCheck,
  Rocket,
  Loader2,
  RefreshCw,
  Heart,
} from "lucide-react";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";

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
 * Displays actor execution statuses and active agent progress.
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
  const tAgents = useTranslations("agents");
  const resolvedGeneratingText = generatingText ?? t("generating");

  const hasActivity =
    state.tasks.length > 0 ||
    state.currentAgent ||
    actorStatuses.length > 0 ||
    isLoading;

  if (!hasActivity) {
    return null;
  }

  const activeNonPmAgent = currentAgent && currentAgent !== "pm" ? currentAgent : null;
  const showActiveStatus = isLoading && activeNonPmAgent;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-muted/50">
      {/* Actor status bar */}
      {actorStatuses.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Heart className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {actorStatuses.map((actor) => (
              <ActorStatusBadge key={actor.actorId} actor={actor} />
            ))}
          </div>
        </div>
      )}

      {/* Active agent status text */}
      {showActiveStatus && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          <span>
            {agentPhase === "progress" && statusMessage
              ? statusMessage
              : `${tAgents(`roles.${activeNonPmAgent}`)}${
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
              : `${tAgents("roles.pm")} ${resolvedGeneratingText}`}
          </span>
        </div>
      )}

      {/* Restart notification */}
      {restartEvent && (
        <div className="flex items-center gap-2 px-1 text-xs text-amber-600 dark:text-amber-400">
          <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
          <span>
            {tAgents(`roles.${restartEvent.role}`)} 重新啟動中
          </span>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function ActorStatusBadge({ actor }: { actor: ActorStatusInfo }) {
  const tAgents = useTranslations("agents");
  const Icon = ROLE_ICONS[actor.role];
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
    >
      {actor.status === "processing" ? (
        <Loader2 className="h-2 w-2 animate-spin" />
      ) : actor.status === "restarting" ? (
        <RefreshCw className="h-2 w-2 animate-spin" />
      ) : (
        <Icon className="h-2 w-2" />
      )}
      <span>{tAgents(`roles.${actor.role}`)}</span>
      <span className="opacity-70">{statusLabels[actor.status]}</span>
    </span>
  );
}
