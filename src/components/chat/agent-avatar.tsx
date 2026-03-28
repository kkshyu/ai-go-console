"use client";

import {
  ClipboardList,
  Blocks,
  Code2,
  ShieldCheck,
  Rocket,
  Bot,
  Palette,
  FlaskConical,
  Database,
  BookOpen,
} from "lucide-react";
import type { AgentRole } from "@/lib/agents/types";
import { AGENT_DEFINITIONS } from "@/lib/agents/types";

const AGENT_ICONS: Record<AgentRole, React.ComponentType<{ className?: string }>> = {
  pm: ClipboardList,
  architect: Blocks,
  developer: Code2,
  reviewer: ShieldCheck,
  devops: Rocket,
  ux_designer: Palette,
  tester: FlaskConical,
  db_migrator: Database,
  doc_writer: BookOpen,
};

const AGENT_BG: Record<AgentRole, string> = {
  pm: "bg-blue-500",
  architect: "bg-purple-500",
  developer: "bg-green-500",
  reviewer: "bg-amber-500",
  devops: "bg-rose-500",
  ux_designer: "bg-fuchsia-500",
  tester: "bg-sky-500",
  db_migrator: "bg-emerald-500",
  doc_writer: "bg-orange-500",
};

interface AgentAvatarProps {
  agentRole?: AgentRole | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { container: "h-6 w-6", icon: "h-3 w-3" },
  md: { container: "h-8 w-8", icon: "h-4 w-4" },
  lg: { container: "h-12 w-12", icon: "h-6 w-6" },
};

export function AgentAvatar({ agentRole, size = "md" }: AgentAvatarProps) {
  const sizeClasses = SIZE_MAP[size].container;
  const iconSize = SIZE_MAP[size].icon;

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
