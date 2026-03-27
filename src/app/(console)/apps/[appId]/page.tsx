"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Square,
  RotateCw,
  Upload,
  Trash2,
  Globe,
  ArrowLeft,
  Terminal,
  Monitor,
  Maximize2,
  X,
  Copy,
  Check,
  ExternalLink,
  ServerCog,
  Pencil,
  ChevronUp,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { AgentChatPanel, type AgentMessage } from "@/components/chat/agent-chat-panel";
import type { AgentRole } from "@/lib/agents/types";

interface AppService {
  service: { id: string; name: string; type: string };
}

interface AppData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  status: string;
  port: number | null;
  services: AppService[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  developing: "warning",
  running: "success",
  stopped: "secondary",
  building: "warning",
  error: "destructive",
};

export default function AppDetailPage() {
  const { appId } = useParams();
  const router = useRouter();
  const t = useTranslations("apps");
  const [app, setApp] = useState<AppData | null>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [buildOutput, setBuildOutput] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ level: string; message: string; timestamp: number }>>([]);
  const [bottomPanel, setBottomPanel] = useState<"logs" | "console" | null>(null);
  const [lastActivePanel, setLastActivePanel] = useState<"logs" | "console">("logs");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDevRunning = app?.status === "running" || app?.status === "developing";
  const hasPreview = app?.port && isDevRunning;
  const previewUrl = hasPreview ? `http://localhost:${app.port}` : null;

  useEffect(() => {
    fetch(`/api/apps/${appId}`)
      .then((res) => res.json())
      .then(setApp);
    fetch(`/api/apps/${appId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setChatMessages(
            data.messages.map((m: { id: string; role: string; content: string; agentRole?: string; stage?: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              agentRole: (m.agentRole as AgentRole) || null,
            }))
          );
        }
        setChatLoaded(true);
      })
      .catch(() => setChatLoaded(true));
  }, [appId]);

  // Auto-refresh logs while panel is open
  useEffect(() => {
    if (bottomPanel !== "logs") {
      if (logsIntervalRef.current) {
        clearInterval(logsIntervalRef.current);
        logsIntervalRef.current = null;
      }
      return;
    }
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/apps/${appId}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logs" }),
        });
        const data = await res.json();
        setLogs(data.logs || "No logs");
      } catch {}
    };
    fetchLogs();
    logsIntervalRef.current = setInterval(fetchLogs, 3000);
    return () => {
      if (logsIntervalRef.current) {
        clearInterval(logsIntervalRef.current);
        logsIntervalRef.current = null;
      }
    };
  }, [bottomPanel, appId]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Listen for console bridge messages from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "__CONSOLE_BRIDGE__") {
        setConsoleLogs((prev) => {
          const next = [...prev, { level: e.data.level, message: e.data.message, timestamp: e.data.timestamp }];
          // Keep last 500 entries
          return next.length > 500 ? next.slice(-500) : next;
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function doAction(action: string) {
    setLoading(true);
    if (action === "publish") {
      setBuildOutput(null);
      setBottomPanel("logs");
    } else {
      setBuildOutput(null);
    }
    try {
      const res = await fetch(`/api/apps/${appId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "publish") {
        setBuildOutput(data.output || (data.error ? `Error: ${data.error}` : "Build completed"));
      }
      const appRes = await fetch(`/api/apps/${appId}`);
      setApp(await appRes.json());
    } catch (err) {
      if (action === "publish") {
        setBuildOutput("Build failed: " + (err instanceof Error ? err.message : "Unknown error"));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure?")) return;
    await fetch(`/api/apps/${appId}`, { method: "DELETE" });
    router.push("/apps");
  }

  const saveMessage = useCallback(
    async (role: string, content: string, agentRole?: AgentRole) => {
      try {
        await fetch(`/api/apps/${appId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content, agentRole }),
        });
      } catch {}
    },
    [appId]
  );

  const handleUserMessage = useCallback(
    (content: string) => {
      saveMessage("user", content);
    },
    [saveMessage]
  );

  const handleAssistantComplete = useCallback(
    (content: string, agentRole?: AgentRole) => {
      saveMessage("assistant", content, agentRole);
    },
    [saveMessage]
  );

  const handleAssistantResponse = useCallback(
    (content: string, agentRole?: AgentRole) => {
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "update_app" && parsed.changes) {
          fetch(`/api/apps/${appId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.changes),
          })
            .then(() => fetch(`/api/apps/${appId}`))
            .then((res) => res.json())
            .then(setApp)
            .catch(() => {});
        }
      } catch {}
    },
    [appId]
  );

  async function handleSaveSlug() {
    if (!app || !slugValue.trim() || slugValue === app.slug) {
      setEditingSlug(false);
      return;
    }
    setSavingSlug(true);
    setSlugError("");
    const res = await fetch(`/api/apps/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugValue.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApp(updated);
      setEditingSlug(false);
    } else {
      const data = await res.json();
      setSlugError(data.error || "Failed to update slug");
    }
    setSavingSlug(false);
  }

  function copyUrl() {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!app) return <div className="p-8">Loading...</div>;

  const consoleLevelConfig: Record<string, { icon: string; bg: string; border: string; iconColor: string; textColor: string }> = {
    error: {
      icon: "\u2715",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-l-2 border-l-red-500",
      iconColor: "text-red-500",
      textColor: "text-red-700 dark:text-red-400",
    },
    warn: {
      icon: "\u26A0",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      border: "border-l-2 border-l-yellow-500",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-800 dark:text-yellow-300",
    },
    info: {
      icon: "\u2139",
      bg: "",
      border: "border-l-2 border-l-blue-400",
      iconColor: "text-blue-500",
      textColor: "text-foreground",
    },
    log: {
      icon: "",
      bg: "",
      border: "border-l-2 border-l-transparent",
      iconColor: "",
      textColor: "text-foreground",
    },
  };

  function renderBottomToolbar() {
    return (
      <div className="flex items-center border-t bg-muted/40">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            bottomPanel === "logs"
              ? "text-foreground bg-background border-t-2 border-primary -mt-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            if (bottomPanel === "logs") {
              setBottomPanel(null);
            } else {
              setBottomPanel("logs");
              setLastActivePanel("logs");
            }
          }}
        >
          <Terminal className="h-3 w-3" />
          {buildOutput !== null || (loading && app?.status === "building")
            ? t("deployLogs")
            : t("logs")}
        </button>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            bottomPanel === "console"
              ? "text-foreground bg-background border-t-2 border-primary -mt-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            if (bottomPanel === "console") {
              setBottomPanel(null);
            } else {
              setBottomPanel("console");
              setLastActivePanel("console");
            }
          }}
        >
          <Monitor className="h-3 w-3" />
          {t("console")}
        </button>
        <div className="ml-auto flex items-center gap-0.5 pr-1">
          {bottomPanel === "logs" && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setLogs(""); setBuildOutput(null); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {bottomPanel === "console" && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setConsoleLogs([])}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              if (bottomPanel) {
                setLastActivePanel(bottomPanel);
                setBottomPanel(null);
              } else {
                setBottomPanel(lastActivePanel);
              }
            }}
          >
            {bottomPanel ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  }

  function renderBottomPanels() {
    return (
      <>
        {bottomPanel === "logs" && (
          <div className="h-40 overflow-auto border-t" style={{ backgroundColor: "#1a1b26" }}>
            {loading && app?.status === "building" && buildOutput === null ? (
              <div className="flex items-center gap-2 p-3 text-xs" style={{ color: "#7aa2f7" }}>
                <RotateCw className="h-3 w-3 animate-spin" />
                <span>{t("building")}...</span>
              </div>
            ) : (
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ color: "#a9b1d6" }}>
                {buildOutput !== null ? buildOutput : (logs || "No logs available")}
                <div ref={logsEndRef} />
              </pre>
            )}
          </div>
        )}
        {bottomPanel === "console" && (
          <div className="h-40 overflow-auto text-xs font-mono border-t bg-white dark:bg-[#242424]">
            {consoleLogs.length === 0 ? (
              <div className="p-3 text-muted-foreground italic">No console output</div>
            ) : (
              consoleLogs.map((entry, i) => {
                const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
                  hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3,
                });
                const config = consoleLevelConfig[entry.level] || consoleLevelConfig.log;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-3 py-1 border-b border-border/40 ${config.bg} ${config.border}`}
                  >
                    {config.icon && (
                      <span className={`shrink-0 ${config.iconColor} w-4 text-center`}>{config.icon}</span>
                    )}
                    <span className={`flex-1 ${config.textColor} break-all`}>{entry.message}</span>
                    <span className="shrink-0 text-muted-foreground/60 tabular-nums">{time}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Title Bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/apps")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight truncate">{app.name}</h1>
        <Badge variant={statusVariant[app.status] || "secondary"}>
          {t(app.status as "developing" | "running" | "stopped" | "building" | "error")}
        </Badge>

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* Slug */}
        {editingSlug ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={slugValue}
              onChange={(e) => { setSlugValue(e.target.value); setSlugError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveSlug();
                if (e.key === "Escape") setEditingSlug(false);
              }}
              className="h-7 w-40 text-xs font-mono"
              autoFocus
              disabled={savingSlug}
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveSlug} disabled={savingSlug}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingSlug(false)}>
              <X className="h-3 w-3" />
            </Button>
            {slugError && <span className="text-xs text-destructive">{slugError}</span>}
          </div>
        ) : (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
            onClick={() => { setSlugValue(app.slug); setEditingSlug(true); setSlugError(""); }}
          >
            {app.slug}
            <Pencil className="h-3 w-3" />
          </button>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* Template & Port */}
        <span className="text-xs text-muted-foreground font-mono">{app.template}</span>
        {app.port && (
          <>
            <span className="text-xs text-muted-foreground">:</span>
            <span className="text-xs text-muted-foreground font-mono">{app.port}</span>
          </>
        )}

        {/* Bound Services */}
        {app.services && app.services.length > 0 && (
          <>
            <div className="h-5 w-px bg-border" />
            <ServerCog className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {app.services.map((as) => (
                <Badge key={as.service.id} variant="outline" className="text-xs font-normal">
                  {as.service.name}
                  <span className="ml-1 text-muted-foreground">{as.service.type}</span>
                </Badge>
              ))}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {(app.status === "developing" && !hasPreview) || app.status === "stopped" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => doAction("dev-start")} disabled={loading}>
                <Play className="h-3.5 w-3.5" />
                Dev
              </Button>
              <Button size="sm" variant="outline" onClick={() => doAction("publish")} disabled={loading}>
                <Upload className="h-3.5 w-3.5" />
                {t("publish")}
              </Button>
            </>
          ) : app.status === "developing" && hasPreview ? (
            <>
              <Button size="sm" variant="outline" onClick={() => doAction("dev-stop")} disabled={loading}>
                <Square className="h-3.5 w-3.5" />
                {t("devStop")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => doAction("publish")} disabled={loading}>
                <Upload className="h-3.5 w-3.5" />
                {t("publish")}
              </Button>
            </>
          ) : app.status === "running" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => doAction("stop")} disabled={loading}>
                <Square className="h-3.5 w-3.5" />
                {t("stop")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => doAction("restart")} disabled={loading}>
                <RotateCw className="h-3.5 w-3.5" />
                {t("restart")}
              </Button>
            </>
          ) : null}

          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Content: Chat + Preview */}
      <div className="flex flex-1 gap-4 min-h-0 flex-col lg:flex-row">
        {/* Multi-Agent Chat Panel */}
        <div className={`flex flex-col min-h-0 transition-all duration-200 overflow-hidden ${chatCollapsed ? "shrink-0 basis-auto" : "shrink-0 basis-1/2 lg:basis-auto lg:shrink-1"} lg:flex-1`}>
          {/* Collapse toggle — mobile/tablet only */}
          <button
            className="flex lg:hidden items-center justify-between px-3 py-2 bg-muted/40 rounded-t-lg border border-b-0 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setChatCollapsed((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </span>
            {chatCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className={`${chatCollapsed ? "hidden lg:flex" : "flex"} flex-1 flex-col min-h-0`}>
            {chatLoaded && (
              <AgentChatPanel
                initialMessages={chatMessages}
                extraRequestBody={{ appId: appId as string }}
                placeholder={t("chatPlaceholder")}
                emptyStateText={t("chatEmptyState")}
                generatingText={t("generating")}
                totalTokensLabel={t("totalTokens")}
                onUserMessage={handleUserMessage}
                onAssistantComplete={handleAssistantComplete}
                onAssistantResponse={handleAssistantResponse}
                showProgress={true}
              />
            )}
          </div>
        </div>

        {/* Preview Panel — browser-like chrome */}
        <div className="flex flex-1 lg:flex-none lg:w-[480px] flex-col min-h-0">
          <div className="flex flex-1 flex-col rounded-lg border overflow-hidden bg-background">
            {hasPreview ? (
              <>
                {/* Browser toolbar */}
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
                  {/* Traffic lights */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                  </div>
                  {/* Address bar */}
                  <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 min-w-0">
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                      {previewUrl}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setIframeKey((k) => k + 1)}
                      title="Refresh"
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={copyUrl}>
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => window.open(previewUrl!, "_blank")}
                    title="Open in browser"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setPreviewFullscreen(true)}
                    title={t("fullscreen")}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
                <iframe
                  key={iframeKey}
                  src={`http://localhost:${app.port}`}
                  className="flex-1 w-full border-0"
                  title="App Preview"
                />
              </>
            ) : (
              <>
                {/* Browser toolbar — disabled state */}
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                    <span className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                    <span className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                  </div>
                  <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 min-w-0 opacity-50">
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-xs font-mono text-muted-foreground">—</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                  <Globe className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">{t("serverNotRunning")}</p>
                  <p className="text-xs mt-1">{t("startDevServer")}</p>
                </div>
              </>
            )}

            {renderBottomToolbar()}
            {renderBottomPanels()}
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {previewFullscreen && hasPreview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="relative w-[95vw] h-[95vh] bg-background rounded-lg border shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="text-sm font-medium">{t("preview")} — {app.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewFullscreen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <iframe
              src={`http://localhost:${app.port}`}
              className="flex-1 w-full border-0"
              title="App Preview Fullscreen"
            />
            {renderBottomToolbar()}
            {renderBottomPanels()}
          </div>
        </div>
      )}
    </div>
  );
}
