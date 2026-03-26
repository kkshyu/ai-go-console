"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Loader2, AlertTriangle, ChevronDown, Zap } from "lucide-react";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ai";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface CreateAppAction {
  action: "create_app";
  name: string;
  template: string;
  description?: string;
  config?: Record<string, unknown>;
  requiredServices?: string[];
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

export default function CreateAppPage() {
  const t = useTranslations("create");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewPort, setPreviewPort] = useState<number | null>(null);
  const [creatingApp, setCreatingApp] = useState(false);
  const [serviceWarning, setServiceWarning] = useState<string | null>(null);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<Record<string, ModelTokenUsage>>(
    {}
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load allowed services for this org
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((org) => {
        if (org.allowedServices) {
          const enabled = org.allowedServices
            .filter((s: { enabled: boolean }) => s.enabled)
            .map((s: { serviceType: string }) => s.serviceType);
          setAllowedServices(enabled);
        }
      })
      .catch(() => {});
  }, []);

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

  // Parse AI response for create_app action
  const parseAction = useCallback(
    (content: string): CreateAppAction | null => {
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return null;
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "create_app") return parsed;
      } catch {}
      return null;
    },
    []
  );

  // Check if required services are authorized
  const checkServiceAuthorization = useCallback(
    (requiredServices: string[]): string[] => {
      if (!requiredServices || requiredServices.length === 0) return [];
      return requiredServices.filter((s) => !allowedServices.includes(s));
    },
    [allowedServices]
  );

  // Create app from action
  const handleCreateApp = useCallback(
    async (action: CreateAppAction) => {
      // Check service authorization
      if (action.requiredServices && action.requiredServices.length > 0) {
        const unauthorized = checkServiceAuthorization(action.requiredServices);
        if (unauthorized.length > 0) {
          setServiceWarning(
            `${t("serviceNotAuthorized")}: ${unauthorized.join(", ")}`
          );
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: `${t("serviceNotAuthorized")}: ${unauthorized.join(", ")}. ${t("contactAdmin")}`,
            },
          ]);
          return;
        }
      }

      setCreatingApp(true);
      setServiceWarning(null);
      try {
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.name,
            template: action.template,
            description: action.description || "",
            config: action.config || {},
          }),
        });

        if (!res.ok) throw new Error("Failed to create app");

        const app = await res.json();

        const genRes = await fetch(`/api/apps/${app.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-start" }),
        });

        if (genRes.ok) {
          const { port } = await genRes.json();
          setPreviewPort(port || app.port);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `App "${action.name}" has been created and dev server is starting on port ${app.port}. You can see the preview on the right panel, or navigate to the app detail page.`,
          },
        ]);

        return app;
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Failed to create app: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ]);
      } finally {
        setCreatingApp(false);
      }
    },
    [checkServiceAuthorization, t]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setServiceWarning(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
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
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
        }),
      });

      if (!res.ok) throw new Error("Chat API error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

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
            // Capture usage data
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

      // Check if response contains a create_app action
      const action = parseAction(fullContent);
      if (action) {
        await handleCreateApp(action);
      }
    } catch (error) {
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
    }
  }

  const totalTokens = Object.values(tokenUsage).reduce(
    (sum, u) => sum + u.totalTokens,
    0
  );

  const selectedModelLabel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.label ??
    selectedModel;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {serviceWarning && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{serviceWarning}</span>
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Panel */}
        <div className="flex flex-1 flex-col">
          <Card className="flex flex-1 flex-col min-h-0">
            <CardContent className="flex flex-1 flex-col p-4 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Bot className="h-12 w-12 mb-4" />
                    <p>{t("placeholder")}</p>
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.content || (
                        <span className="animate-pulse">{t("generating")}</span>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {creatingApp && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("generating")}
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
                      {t("totalTokens")}: {formatTokenCount(totalTokens)}
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
                {/* Model Selector */}
                <div className="relative" ref={modelMenuRef}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-xs whitespace-nowrap"
                    onClick={() => setModelMenuOpen((v) => !v)}
                    disabled={isLoading || creatingApp}
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
                    placeholder={t("placeholder")}
                    disabled={isLoading || creatingApp}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || creatingApp || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:flex w-1/2">
          <Card className="flex flex-1 flex-col overflow-hidden">
            {previewPort ? (
              <iframe
                src={`http://localhost:${previewPort}`}
                className="flex-1 w-full border-0"
                title="App Preview"
              />
            ) : (
              <CardContent className="flex flex-1 items-center justify-center text-center text-muted-foreground">
                <div>
                  <p className="text-lg font-medium">{t("preview")}</p>
                  <p className="text-sm mt-1">
                    App preview will appear here after creation
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
