"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, User, Loader2, ChevronDown, Zap, MessageCircle } from "lucide-react";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai";
import {
  createInitialOrchestrationState,
} from "@/lib/agents/types";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { PipelineProgress, type ActorStatusInfo } from "./pipeline-progress";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { AgentAvatar } from "./agent-avatar";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentRole?: AgentRole | null;
}

interface ModelTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export interface AgentChatPanelProps {
  initialMessages?: AgentMessage[];
  onAssistantResponse?: (content: string, agentRole?: AgentRole) => void;
  onUserMessage?: (content: string) => void;
  onAssistantComplete?: (content: string, agentRole?: AgentRole) => void;
  onOrchestrationUpdate?: (state: OrchestrationState) => void;
  onFilesWritten?: (paths: string[]) => void;
  extraRequestBody?: Record<string, unknown>;
  placeholder?: string;
  emptyStateText?: string;
  generatingText?: string;
  totalTokensLabel?: string;
  externalLoading?: boolean;
  pipelineId?: string;
  showProgress?: boolean;
}

type AgentPhase = "thinking" | "translating" | "progress" | null;

export function AgentChatPanel({
  initialMessages = [],
  onAssistantResponse,
  onUserMessage,
  onAssistantComplete,
  onOrchestrationUpdate,
  onFilesWritten,
  extraRequestBody,
  placeholder,
  emptyStateText,
  generatingText,
  totalTokensLabel,
  externalLoading = false,
  pipelineId,
  showProgress = true,
}: AgentChatPanelProps) {
  const t = useTranslations("chat");
  const tAgents = useTranslations("agents");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const resolvedEmptyStateText = emptyStateText ?? t("emptyState");
  const resolvedGeneratingText = generatingText ?? t("generating");
  const resolvedTotalTokensLabel = totalTokensLabel ?? t("totalTokens");
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<Record<string, ModelTokenUsage>>({});
  const [orchState, setOrchState] = useState<OrchestrationState>(
    createInitialOrchestrationState()
  );
  const [currentAgent, setCurrentAgent] = useState<AgentRole | null>(null);
  const [agentPhase, setAgentPhase] = useState<AgentPhase>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [actorStatuses, setActorStatuses] = useState<ActorStatusInfo[]>([]);
  const [restartEvent, setRestartEvent] = useState<{ actorId: string; role: string; restartCount: number } | null>(null);
  const [needsUserInput, setNeedsUserInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node)
      ) {
        setModelMenuOpen(false);
      }
    }
    if (modelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [modelMenuOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || externalLoading) return;

      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);
      setNeedsUserInput(false);

      onUserMessage?.(userMessage.content);

      try {
        const res = await fetch("/api/chat/multi-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
              agentRole: m.agentRole,
            })),
            model: selectedModel,
            pipelineId,
            orchestrationState: orchState,
            ...extraRequestBody,
          }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          throw new Error(errorBody?.error || `Chat API error (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error(t("errorNoResponse"));

        const decoder = new TextDecoder();
        let rawContent = "";
        let resolvedAgent: AgentRole | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((line) => line.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // Agent is thinking
              if (parsed.thinking) {
                setAgentPhase("thinking");
                setStatusMessage((prev) => prev || "正在思考中...");
                continue;
              }

              // Agent output is being translated
              if (parsed.translating) {
                setAgentPhase("translating");
                setStatusMessage("正在整理回覆內容...");
                continue;
              }

              // Progress status update from PM
              if (parsed.statusUpdate) {
                setAgentPhase("progress");
                setStatusMessage(parsed.statusUpdate);
                continue;
              }

              // PM sends a complete message to the user
              if (parsed.pmMessage) {
                const msgId = (Date.now() + Math.random()).toString();
                setMessages((prev) => [
                  ...prev,
                  { id: msgId, role: "assistant", content: parsed.pmMessage, agentRole: "pm" },
                ]);
                continue;
              }

              // Agent completed
              if (parsed.agentComplete) {
                rawContent = parsed.rawContent || rawContent;
                setAgentPhase(null);
                onAssistantResponse?.(rawContent, resolvedAgent || undefined);
                onAssistantComplete?.(rawContent, resolvedAgent || undefined);

                // Update orchestration state if provided
                if (parsed.orchestrationState) {
                  setOrchState(parsed.orchestrationState);
                  onOrchestrationUpdate?.(parsed.orchestrationState);
                }

                // PM needs user input — show prompt
                if (parsed.needsUserInput) {
                  setNeedsUserInput(true);
                }

                // Update actor status to idle
                if (parsed.agentRole && parsed.agentRole !== "pm") {
                  setActorStatuses((prev) =>
                    prev.map((a) =>
                      a.role === parsed.agentRole
                        ? { ...a, status: "idle" as const }
                        : a
                    )
                  );
                }

                // Reset for next agent
                rawContent = "";
                resolvedAgent = null;
                continue;
              }

              // Agent metadata
              if (parsed.agentRole && parsed.orchestrationState) {
                resolvedAgent = parsed.agentRole;
                setCurrentAgent(parsed.agentRole);
                setOrchState(parsed.orchestrationState);
                onOrchestrationUpdate?.(parsed.orchestrationState);
                // Track active actor status
                if (parsed.agentRole !== "pm") {
                  setActorStatuses((prev) => {
                    const actorId = `${parsed.agentRole}-0`;
                    const existing = prev.findIndex((a) => a.actorId === actorId);
                    const updated: ActorStatusInfo = {
                      actorId,
                      role: parsed.agentRole,
                      status: "processing",
                    };
                    if (existing >= 0) {
                      const next = [...prev];
                      next[existing] = updated;
                      return next;
                    }
                    return [...prev, updated];
                  });
                }
              }

              // Translated content (accumulated for rawContent, not shown in-place)
              if (parsed.content) {
                rawContent += parsed.content;
                setAgentPhase(null);
                setStatusMessage("");
              }

              // Parallel group status
              if (parsed.parallelGroup) {
                setOrchState((prev) => ({
                  ...prev,
                  parallelGroups: [
                    ...(prev.parallelGroups || []).filter(
                      (g) => g.groupId !== parsed.parallelGroup.groupId
                    ),
                    {
                      groupId: parsed.parallelGroup.groupId,
                      tasks: parsed.parallelGroup.tasks,
                      status: "running" as const,
                    },
                  ],
                }));
                continue;
              }

              // Individual parallel actor status update
              if (parsed.parallelActorStatus) {
                setOrchState((prev) => ({
                  ...prev,
                  parallelGroups: (prev.parallelGroups || []).map((g) => {
                    if (g.groupId !== parsed.parallelActorStatus.groupId) return g;
                    const updatedTasks = g.tasks.map((t) =>
                      t.actorId === parsed.parallelActorStatus.actorId
                        ? { ...t, status: parsed.parallelActorStatus.status }
                        : t
                    );
                    const allDone = updatedTasks.every(
                      (t) => t.status === "completed"
                    );
                    return { ...g, tasks: updatedTasks, status: allDone ? "completed" as const : g.status };
                  }),
                }));
                continue;
              }

              // Actor restarted by supervisor
              if (parsed.actorRestarted) {
                setRestartEvent({
                  actorId: parsed.actorRestarted.actorId,
                  role: parsed.actorRestarted.role,
                  restartCount: parsed.actorRestarted.restartCount,
                });
                // Update actor statuses
                setActorStatuses((prev) => {
                  const existing = prev.findIndex(
                    (a) => a.actorId === parsed.actorRestarted.actorId
                  );
                  const updated: ActorStatusInfo = {
                    actorId: parsed.actorRestarted.actorId,
                    role: parsed.actorRestarted.role as AgentRole,
                    status: "restarting",
                    restartCount: parsed.actorRestarted.restartCount,
                  };
                  if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = updated;
                    return next;
                  }
                  return [...prev, updated];
                });
                // Clear restart event after 3 seconds
                setTimeout(() => setRestartEvent(null), 3000);
                continue;
              }

              // Files written to Docker container by backend
              if (parsed.filesWritten) {
                onFilesWritten?.(parsed.filesWritten.paths || []);
                continue;
              }

              // Error
              if (parsed.error) {
                setAgentPhase(null);
                const errorMsgId = (Date.now() + Math.random()).toString();
                setMessages((prev) => [
                  ...prev,
                  { id: errorMsgId, role: "assistant", content: `Error: ${parsed.error}`, agentRole: "pm" },
                ]);
              }

              // Token usage
              if (parsed.usage && parsed.model) {
                setTokenUsage((prev) => {
                  const existing = prev[parsed.model] || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  };
                  return {
                    ...prev,
                    [parsed.model]: {
                      promptTokens:
                        existing.promptTokens + (parsed.usage.promptTokens || 0),
                      completionTokens:
                        existing.completionTokens +
                        (parsed.usage.completionTokens || 0),
                      totalTokens:
                        existing.totalTokens + (parsed.usage.totalTokens || 0),
                    },
                  };
                });
              }
            } catch {}
          }
        }

        // Final agent (no agentComplete event for the last one)
        if (rawContent) {
          onAssistantResponse?.(rawContent, resolvedAgent || undefined);
          onAssistantComplete?.(rawContent, resolvedAgent || undefined);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        const errorId = (Date.now() + Math.random()).toString();
        setMessages((prev) => [
          ...prev,
          { id: errorId, role: "assistant", content: errorMessage || t("errorApiKey"), agentRole: "pm" },
        ]);
      } finally {
        setIsLoading(false);
        setCurrentAgent(null);
        setAgentPhase(null);
        setStatusMessage("");
        setRestartEvent(null);
      }
    },
    [
      input,
      isLoading,
      externalLoading,
      messages,
      selectedModel,
      extraRequestBody,
      pipelineId,
      orchState,
      onUserMessage,
      onAssistantResponse,
      onAssistantComplete,
      onOrchestrationUpdate,
      onFilesWritten,
      t,
    ]
  );

  const totalTokens = Object.values(tokenUsage).reduce(
    (sum, u) => sum + u.totalTokens,
    0
  );

  const selectedModelLabel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label ??
    selectedModel;

  const disabled = isLoading || externalLoading;

  return (
    <Card className="flex flex-1 flex-col min-h-0">
      <CardContent className="flex flex-1 flex-col p-4 min-h-0">
        {/* Messages — only user + PM agent shown as chat bubbles */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="grid grid-cols-5 gap-3 mb-4 w-full max-w-lg">
                {(["pm", "architect", "developer", "reviewer", "devops"] as AgentRole[]).map(
                  (role) => {
                    return (
                      <div key={role} className="flex flex-col items-center text-center gap-1.5">
                        <AgentAvatar agentRole={role} size="lg" />
                        <span className="text-xs font-medium text-foreground">{tAgents(`roles.${role}`)}</span>
                        <span className="text-[10px] leading-tight">{tAgents(`roleDescriptions.${role}`)}</span>
                      </div>
                    );
                  }
                )}
              </div>
              <p className="text-sm">{resolvedEmptyStateText}</p>
            </div>
          )}
          {messages
            .filter(
              (m) =>
                m.role === "user" ||
                (m.content && (!m.agentRole || m.agentRole === "pm"))
            )
            .map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <AgentAvatar agentRole="pm" />
              )}
              <div className="max-w-[80%] flex flex-col gap-1">
                <div
                  className={`rounded-lg px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "bg-muted"
                  }`}
                >
                  {message.content ? (
                    message.role === "assistant" ? (
                      <MarkdownContent content={message.content} />
                    ) : (
                      message.content
                    )
                  ) : (
                    <span className="flex items-center gap-2 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {resolvedGeneratingText}
                    </span>
                  )}
                </div>
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {/* PM status update as regular chat message */}
          {(isLoading || externalLoading) && statusMessage && (
            <div className="flex gap-3 justify-start">
              <AgentAvatar agentRole="pm" />
              <div className="max-w-[80%] flex flex-col gap-1">
                <div className="rounded-lg px-4 py-2 text-sm bg-muted">
                  {statusMessage}
                </div>
              </div>
            </div>
          )}
          {externalLoading && (
            <div className="flex gap-3">
              <AgentAvatar agentRole="pm" />
              <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {resolvedGeneratingText}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* PM needs user input prompt */}
        {needsUserInput && !isLoading && !externalLoading && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>PM 正在等待您的回覆，請在下方輸入訊息</span>
          </div>
        )}

        {/* Agent Progress — below messages */}
        {showProgress && (
          <div className="mb-3">
            <PipelineProgress
              state={orchState}
              currentAgent={currentAgent}
              isLoading={isLoading || externalLoading}
              agentPhase={agentPhase}
              statusMessage={statusMessage}
              generatingText={resolvedGeneratingText}
              actorStatuses={actorStatuses}
              restartEvent={restartEvent}
            />
          </div>
        )}

        {/* Token Usage Status Bar */}
        {totalTokens > 0 && (
          <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>
                {resolvedTotalTokensLabel}: {formatTokenCount(totalTokens)}
              </span>
            </div>
            <div className="h-3 w-px bg-border" />
            {Object.entries(tokenUsage).map(([modelId, usage]) => {
              const label =
                AVAILABLE_MODELS.find((m) => m.id === modelId)?.label ??
                modelId.split("/").pop();
              return (
                <span key={modelId}>
                  {label}: {formatTokenCount(usage.totalTokens)}
                </span>
              );
            })}
          </div>
        )}

        {/* Model Selector + Input */}
        <div className="flex gap-2">
          <div className="relative" ref={modelMenuRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 text-xs whitespace-nowrap"
              onClick={() => setModelMenuOpen((v) => !v)}
              disabled={disabled}
            >
              {selectedModelLabel}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {modelMenuOpen && (
              <div className="absolute bottom-full left-0 mb-1 z-50 w-56 rounded-md border bg-popover p-1 shadow-md">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                      selectedModel === model.id
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setModelMenuOpen(false);
                    }}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={resolvedPlaceholder}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={disabled || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
