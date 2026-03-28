"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";

type AgentPhase = "thinking" | "translating" | "progress" | null;

export interface ActorStatusInfo {
  actorId: string;
  role: string;
  status: string;
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
 * Displays a single status text line for agent progress.
 * All status updates come from the PM agent.
 */
export function AgentProgress({
  state: _state,
  currentAgent,
  isLoading,
  agentPhase,
  statusMessage,
  generatingText,
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

  if (!text) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground animate-pulse">
      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      <span>{text}</span>
    </div>
  );
}
