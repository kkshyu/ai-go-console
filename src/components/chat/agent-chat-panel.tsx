"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, User, Loader2, ChevronDown, Zap } from "lucide-react";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai";
import { AGENT_DEFINITIONS, createInitialOrchestrationState } from "@/lib/agents/types";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";
import { PipelineProgress } from "./pipeline-progress";
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
  extraRequestBody,
  placeholder = "Type a message...",
  emptyStateText = "Start a conversation",
  generatingText = "Generating...",
  totalTokensLabel = "Tokens",
  externalLoading = false,
  pipelineId,
  showProgress = true,
}: AgentChatPanelProps) {
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

      onUserMessage?.(userMessage.content);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", agentRole: null },
      ]);

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

        if (!res.ok) throw new Error("Chat API error");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let displayContent = "";
        let rawContent = "";
        let resolvedAgent: AgentRole | null = null;
        let currentMsgId = assistantId;

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
                continue;
              }

              // Agent output is being translated
              if (parsed.translating) {
                setAgentPhase("translating");
                setStatusMessage("");
                continue;
              }

              // Progress status update from PM
              if (parsed.statusUpdate) {
                setAgentPhase("progress");
                setStatusMessage(parsed.statusUpdate);
                continue;
              }

              // Agent completed
              if (parsed.agentComplete) {
                rawContent = parsed.rawContent || rawContent;
                setAgentPhase(null);
                onAssistantResponse?.(rawContent, resolvedAgent || undefined);
                onAssistantComplete?.(displayContent, resolvedAgent || undefined);

                // Update orchestration state if provided
                if (parsed.orchestrationState) {
                  setOrchState(parsed.orchestrationState);
                  onOrchestrationUpdate?.(parsed.orchestrationState);
                }

                // Reset for next agent's message
                displayContent = "";
                rawContent = "";
                resolvedAgent = null;
                currentMsgId = (Date.now() + Math.random()).toString();
                setMessages((prev) => [
                  ...prev,
                  { id: currentMsgId, role: "assistant", content: "", agentRole: null },
                ]);
                continue;
              }

              // Agent metadata
              if (parsed.agentRole && parsed.orchestrationState) {
                resolvedAgent = parsed.agentRole;
                setCurrentAgent(parsed.agentRole);
                setOrchState(parsed.orchestrationState);
                onOrchestrationUpdate?.(parsed.orchestrationState);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMsgId
                      ? { ...m, agentRole: parsed.agentRole }
                      : m
                  )
                );
              }

              // Translated content for display
              if (parsed.content) {
                displayContent += parsed.content;
                setAgentPhase(null);
                setStatusMessage("");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMsgId ? { ...m, content: displayContent } : m
                  )
                );
              }

              // Error
              if (parsed.error) {
                setAgentPhase(null);
                displayContent += `\n\nError: ${parsed.error}`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === currentMsgId ? { ...m, content: displayContent } : m
                  )
                );
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
        if (displayContent) {
          onAssistantResponse?.(rawContent || displayContent, resolvedAgent || undefined);
          onAssistantComplete?.(displayContent, resolvedAgent || undefined);
        }

        // Remove any empty assistant messages left over from agentComplete handlers
        setMessages((prev) =>
          prev.filter((m) => m.role !== "assistant" || m.content)
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    "Sorry, I encountered an error. Please check your OpenRouter API key is configured.",
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setCurrentAgent(null);
        setAgentPhase(null);
        setStatusMessage("");
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
        {/* Agent Progress */}
        {showProgress && (
          <div className="mb-3">
            <PipelineProgress
              state={orchState}
              currentAgent={currentAgent}
              isLoading={isLoading || externalLoading}
              agentPhase={agentPhase}
              statusMessage={statusMessage}
              generatingText={generatingText}
            />
          </div>
        )}

        {/* Messages — only user + PM agent shown as chat bubbles */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="flex gap-2 mb-4">
                {(["pm", "architect", "developer", "reviewer", "devops"] as AgentRole[]).map(
                  (role) => (
                    <AgentAvatar key={role} agentRole={role} size="sm" />
                  )
                )}
              </div>
              <p className="text-sm">{emptyStateText}</p>
            </div>
          )}
          {messages
            .filter(
              (m) =>
                m.role === "user" ||
                ((m.content || m.agentRole) && (!m.agentRole || m.agentRole === "pm"))
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
                      {generatingText}
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
          {externalLoading && (
            <div className="flex gap-3">
              <AgentAvatar agentRole="pm" />
              <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {generatingText}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Token Usage Status Bar */}
        {totalTokens > 0 && (
          <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>
                {totalTokensLabel}: {formatTokenCount(totalTokens)}
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
              placeholder={placeholder}
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
