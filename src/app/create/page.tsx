"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Loader2 } from "lucide-react";

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
}

export default function CreateAppPage() {
  const t = useTranslations("create");
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewPort, setPreviewPort] = useState<number | null>(null);
  const [creatingApp, setCreatingApp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Parse AI response for create_app action
  const parseAction = useCallback((content: string): CreateAppAction | null => {
    const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) return null;
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action === "create_app") return parsed;
    } catch {}
    return null;
  }, []);

  // Create app from action
  const handleCreateApp = useCallback(
    async (action: CreateAppAction) => {
      setCreatingApp(true);
      try {
        // Create the app via API
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.name,
            template: action.template,
            description: action.description || "",
            config: action.config || {},
            userId: "temp-user", // TODO: use actual auth user
          }),
        });

        if (!res.ok) throw new Error("Failed to create app");

        const app = await res.json();

        // Generate app files
        const genRes = await fetch(`/api/apps/${app.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-start" }),
        });

        if (genRes.ok) {
          const { port } = await genRes.json();
          setPreviewPort(port || app.port);
        }

        // Add success message
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
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Add placeholder for streaming response
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

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

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

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
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
