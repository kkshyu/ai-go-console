"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Loader2, ChevronDown, Zap } from "lucide-react";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai";
import { MarkdownContent } from "@/components/chat/markdown-content";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export interface TokenUsageMap {
  [modelId: string]: ModelTokenUsage;
}

export interface ChatPanelProps {
  initialMessages?: Message[];
  onAssistantResponse?: (content: string) => void;
  onUserMessage?: (content: string) => void;
  onAssistantComplete?: (content: string) => void;
  onTokenUsageChange?: (usage: TokenUsageMap) => void;
  extraRequestBody?: Record<string, unknown>;
  placeholder?: string;
  emptyStateText?: string;
  generatingText?: string;
  totalTokensLabel?: string;
  externalLoading?: boolean;
  autoSend?: boolean;
}

export function ChatPanel({
  initialMessages = [],
  onAssistantResponse,
  onUserMessage,
  onAssistantComplete,
  onTokenUsageChange,
  extraRequestBody,
  placeholder,
  emptyStateText,
  generatingText,
  totalTokensLabel,
  externalLoading = false,
  autoSend = false,
}: ChatPanelProps) {
  const t = useTranslations("chat");
  const resolvedPlaceholder = placeholder ?? t("placeholder");
  const resolvedEmptyStateText = emptyStateText ?? t("emptyState");
  const resolvedGeneratingText = generatingText ?? t("generating");
  const resolvedTotalTokensLabel = totalTokensLabel ?? t("totalTokens");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<Record<string, ModelTokenUsage>>(
    {}
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Sync initialMessages when they change (e.g. loaded from DB)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close model menu on outside click
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

  const sendMessages = useCallback(
    async (messagesToSend: Message[]) => {
      setIsLoading(true);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            ...extraRequestBody,
          }),
        });

        if (!res.ok) throw new Error(t("errorApi"));

        const reader = res.body?.getReader();
        if (!reader) throw new Error(t("errorNoResponse"));

        const decoder = new TextDecoder();
        let fullContent = "";

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
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }
              if (parsed.error) {
                fullContent += `\n\nError: ${parsed.error}`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }
              if (parsed.usage && parsed.model) {
                setTokenUsage((prev) => {
                  const existing = prev[parsed.model] || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  };
                  const next = {
                    ...prev,
                    [parsed.model]: {
                      promptTokens:
                        existing.promptTokens +
                        (parsed.usage.promptTokens || 0),
                      completionTokens:
                        existing.completionTokens +
                        (parsed.usage.completionTokens || 0),
                      totalTokens:
                        existing.totalTokens +
                        (parsed.usage.totalTokens || 0),
                    },
                  };
                  onTokenUsageChange?.(next);
                  return next;
                });
              }
            } catch {}
          }
        }

        onAssistantResponse?.(fullContent);
        onAssistantComplete?.(fullContent);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    t("errorApiKey"),
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedModel,
      extraRequestBody,
      onAssistantResponse,
      onAssistantComplete,
      onTokenUsageChange,
      t,
    ]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || externalLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");

      onUserMessage?.(userMessage.content);

      await sendMessages(newMessages);
    },
    [
      input,
      isLoading,
      externalLoading,
      messages,
      onUserMessage,
      sendMessages,
    ]
  );

  // Auto-send: when initialMessages end with a user message, trigger API call automatically
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (
      autoSend &&
      !autoSentRef.current &&
      initialMessages.length > 0 &&
      initialMessages[initialMessages.length - 1].role === "user"
    ) {
      // Defer to survive React strict mode cleanup-then-remount cycle
      const timer = setTimeout(() => {
        if (autoSentRef.current) return;
        autoSentRef.current = true;
        onUserMessage?.(initialMessages[initialMessages.length - 1].content);
        sendMessages(initialMessages);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoSend, initialMessages, sendMessages, onUserMessage]);

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
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-12 w-12 mb-4" />
              <p>{resolvedEmptyStateText}</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
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
                  <span className="animate-pulse">{resolvedGeneratingText}</span>
                )}
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {resolvedGeneratingText}
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
