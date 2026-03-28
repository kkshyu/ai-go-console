"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { AGENT_DEFINITIONS } from "@/lib/agents/types";

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
 * Displays a single status text line for agent progress.
 * All status updates come from the PM agent.
 */
export function PipelineProgress({
  state,
  currentAgent,
  isLoading,
  agentPhase,
  statusMessage,
  generatingText,
}: AgentProgressProps) {
  const t = useTranslations("chat");
  const resolvedGeneratingText = generatingText ?? t("generating");

  if (!isLoading) {
    return null;
  }

  // Determine status text
  let text = "";
  if (agentPhase === "progress" && statusMessage) {
    text = statusMessage;
  } else if (currentAgent && currentAgent !== "pm") {
    const label = AGENT_DEFINITIONS[currentAgent]?.label || currentAgent;
    text = agentPhase === "translating" ? `${label} ...` : `${label} ${resolvedGeneratingText}`;
  } else if (currentAgent === "pm") {
    text = statusMessage || `PM ${resolvedGeneratingText}`;
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
