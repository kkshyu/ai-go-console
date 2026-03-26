"use client";

import {
  ClipboardList,
  Blocks,
  Code2,
  ShieldCheck,
  Rocket,
  Bot,
} from "lucide-react";
import type { AgentRole } from "@/lib/agents/types";
import { AGENT_DEFINITIONS } from "@/lib/agents/types";

const AGENT_ICONS: Record<AgentRole, React.ComponentType<{ className?: string }>> = {
  pm: ClipboardList,
  architect: Blocks,
  developer: Code2,
  reviewer: ShieldCheck,
  devops: Rocket,
};

const AGENT_BG: Record<AgentRole, string> = {
  pm: "bg-blue-500",
  architect: "bg-purple-500",
  developer: "bg-green-500",
  reviewer: "bg-amber-500",
  devops: "bg-rose-500",
};

interface AgentAvatarProps {
  agentRole?: AgentRole | null;
  size?: "sm" | "md";
}

export function AgentAvatar({ agentRole, size = "md" }: AgentAvatarProps) {
  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (!agentRole) {
    return (
      <div
        className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground`}
      >
        <Bot className={iconSize} />
      </div>
    );
  }

  const Icon = AGENT_ICONS[agentRole];
  const bg = AGENT_BG[agentRole];
  const agent = AGENT_DEFINITIONS[agentRole];

  return (
    <div
      className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full ${bg} text-white`}
      title={agent.description}
    >
      <Icon className={iconSize} />
    </div>
  );
}
