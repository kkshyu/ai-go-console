"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  History,
  Undo2,
  Server,
  FolderOpen,
} from "lucide-react";
import { AgentChatPanel, type AgentMessage } from "@/components/chat/agent-chat-panel";
import { FileManager } from "@/components/file-manager/file-manager";
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
  prodPort: number | null;
  services: AppService[];
}

interface DeploymentData {
  id: string;
  version: number;
  status: string;
  buildLog: string | null;
  imageTag: string | null;
  createdAt: string;
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
  const [devLogs, setDevLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ level: string; message: string; timestamp: number }>>([]);
  const [bottomPanel, setBottomPanel] = useState<"logs" | "console" | null>(null);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [fullscreenBottomPanel, setFullscreenBottomPanel] = useState<"logs" | "console" | null>(null);
  const [fullscreenPanelCollapsed, setFullscreenPanelCollapsed] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const logsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Deployment state
  const [deployments, setDeployments] = useState<DeploymentData[]>([]);
  const [deployPanel, setDeployPanel] = useState<"systemLog" | "buildLog" | "history" | null>(null);
  const [buildOutput, setBuildOutput] = useState<string | null>(null);
  const [prodLogs, setProdLogs] = useState("");
  const [rollingBack, setRollingBack] = useState(false);
  const prodLogsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prodLogsEndRef = useRef<HTMLDivElement>(null);

  // Right panel tab state
  const [rightPanel, setRightPanel] = useState<"preview" | "deploy" | "files">("preview");

  // Dev server is running if we have a port and it's in developing state
  const [devRunning, setDevRunning] = useState(false);
  const hasPreview = app?.port && devRunning;
  const previewUrl = hasPreview ? `http://localhost:${app.port}` : null;

  // Production is running if app status is "running"
  const isProdRunning = app?.status === "running";

  useEffect(() => {
    fetch(`/api/apps/${appId}`)
      .then((res) => res.json())
      .then((data) => {
        setApp(data);
        // Check dev server status on load by trying to fetch dev logs
        checkDevServerStatus(data.slug);
      });
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
    fetchDeployments();
  }, [appId]);

  async function checkDevServerStatus(slug: string) {
    try {
      const res = await fetch(`/api/apps/${appId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dev-logs" }),
      });
      const data = await res.json();
      // If dev-logs returns non-empty, dev server is likely running
      setDevRunning(data.logs && data.logs.trim().length > 0);
    } catch {
      setDevRunning(false);
    }
  }

  async function fetchDeployments() {
    try {
      const res = await fetch(`/api/apps/${appId}/deployments`);
      const data = await res.json();
      setDeployments(data);
    } catch {}
  }

  // Auto-refresh dev logs while panel is open
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
          body: JSON.stringify({ action: "dev-logs" }),
        });
        const data = await res.json();
        setDevLogs(data.logs || "No logs");
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

  // Auto-refresh prod logs while system log panel is open
  useEffect(() => {
    if (deployPanel !== "systemLog") {
      if (prodLogsIntervalRef.current) {
        clearInterval(prodLogsIntervalRef.current);
        prodLogsIntervalRef.current = null;
      }
      return;
    }
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/apps/${appId}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prod-logs" }),
        });
        const data = await res.json();
        setProdLogs(data.logs || "No logs");
      } catch {}
    };
    fetchLogs();
    prodLogsIntervalRef.current = setInterval(fetchLogs, 3000);
    return () => {
      if (prodLogsIntervalRef.current) {
        clearInterval(prodLogsIntervalRef.current);
        prodLogsIntervalRef.current = null;
      }
    };
  }, [deployPanel, appId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [devLogs]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  useEffect(() => {
    prodLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [prodLogs]);

  // Listen for console bridge messages from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "__CONSOLE_BRIDGE__") {
        setConsoleLogs((prev) => {
          const next = [...prev, { level: e.data.level, message: e.data.message, timestamp: e.data.timestamp }];
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
      setDeployPanel("buildLog");
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
        fetchDeployments();
      }
      if (action === "dev-start") {
        setDevRunning(true);
      }
      if (action === "dev-stop") {
        setDevRunning(false);
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

  async function handleRollback(deploymentId: string) {
    setRollingBack(true);
    setDeployPanel("buildLog");
    setBuildOutput(null);
    try {
      const res = await fetch(`/api/apps/${appId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", deploymentId }),
      });
      const data = await res.json();
      setBuildOutput(data.output || (data.error ? `Error: ${data.error}` : "Rollback completed"));
      fetchDeployments();
      const appRes = await fetch(`/api/apps/${appId}`);
      setApp(await appRes.json());
    } catch (err) {
      setBuildOutput("Rollback failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setRollingBack(false);
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
        } else if (parsed.action === "modify_files" && parsed.files) {
          // Write files to the app's working directory
          fetch(`/api/apps/${appId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: parsed.files }),
          })
            .then((res) => res.json())
            .then(() => {
              // Refresh app data
              fetch(`/api/apps/${appId}`)
                .then((res) => res.json())
                .then(setApp)
                .catch(() => {});
              // Refresh file manager if open
              if (rightPanel === "files") {
                fetchFiles(filePath);
              }
            })
            .catch(() => {});
        }
      } catch {}
    },
    [appId, rightPanel, filePath]
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

  const currentDeployment = deployments.find((d) => d.status === "running");

  // Helper: color for log lines (ghostty terminal theme)
  function getLogLineColor(line: string): string {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("err!") || lower.includes("failed")) return "#f87171";
    if (lower.includes("warn")) return "#fbbf24";
    if (lower.includes("ready") || lower.includes("compiled") || lower.includes("success")) return "#4ade80";
    return "#d4d4d4";
  }

  // Shared render: bottom toolbar
  function renderBottomToolbar(
    panel: "logs" | "console" | null,
    setPanel: (v: "logs" | "console" | null) => void,
    collapsed: boolean,
    setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void,
  ) {
    return (
      <div className="flex items-center border-t bg-muted/40">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            panel === "logs"
              ? "text-foreground bg-background border-t-2 border-primary -mt-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setPanel(panel === "logs" ? null : "logs")}
        >
          <Terminal className="h-3 w-3" />
          {t("logs")}
        </button>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            panel === "console"
              ? "text-foreground bg-background border-t-2 border-primary -mt-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setPanel(panel === "console" ? null : "console")}
        >
          <Monitor className="h-3 w-3" />
          {t("console")}
        </button>
        <div className="ml-auto flex items-center gap-1 pr-1">
          {(panel === "console" || panel === "logs") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (panel === "console") setConsoleLogs([]);
                if (panel === "logs") setDevLogs("");
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          {panel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCollapsed((prev: boolean) => !prev)}
            >
              {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Shared render: Ghostty-themed log panel
  function renderLogPanel(height: string = "h-40") {
    return (
      <div
        className={`${height} overflow-auto font-mono text-xs`}
        style={{ backgroundColor: "#1c1c1c", color: "#d4d4d4" }}
      >
        {!devLogs ? (
          <div className="flex items-center justify-center h-full" style={{ color: "#6b7280" }}>
            No logs available
          </div>
        ) : (
          devLogs.split("\n").map((line, i) => (
            <div
              key={i}
              className="px-3 py-0.5 leading-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span
                className="inline-block w-8 text-right mr-3"
                style={{ color: "#6b7280", userSelect: "none" }}
              >
                {i + 1}
              </span>
              <span style={{ color: getLogLineColor(line) }}>{line}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    );
  }

  // Shared render: Chrome DevTools-styled console panel
  function renderConsolePanel(height: string = "h-40") {
    return (
      <div className={`${height} overflow-auto text-xs font-mono border-t bg-white`}>
        {consoleLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No console output
          </div>
        ) : (
          consoleLogs.map((entry, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start px-3 py-1 border-b gap-2",
                entry.level === "error" && "bg-red-50 text-red-800 border-red-200/60",
                entry.level === "warn" && "bg-yellow-50 text-yellow-800 border-yellow-200/60",
                entry.level !== "error" && entry.level !== "warn" && "border-border/50 text-foreground",
              )}
            >
              <span className="shrink-0 mt-0.5 w-4 text-center select-none">
                {entry.level === "error" ? "✕" : entry.level === "warn" ? "⚠" : entry.level === "info" ? "ⓘ" : ""}
              </span>
              <span className="flex-1 whitespace-pre-wrap break-all">{entry.message}</span>
              <span className="shrink-0 text-muted-foreground/60 text-[10px] tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    );
  }

  if (!app) return <div className="p-8">Loading...</div>;

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

        {/* Template & Ports */}
        <span className="text-xs text-muted-foreground font-mono">{app.template}</span>
        {app.port && (
          <>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground font-mono">{t("devPort")}:{app.port}</span>
          </>
        )}
        {app.prodPort && (
          <>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground font-mono">{t("prodPort")}:{app.prodPort}</span>
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
          {/* Dev server controls */}
          {devRunning ? (
            <Button size="sm" variant="outline" onClick={() => doAction("dev-stop")} disabled={loading}>
              <Square className="h-3.5 w-3.5" />
              {t("previewStop")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => doAction("dev-start")} disabled={loading}>
              <Play className="h-3.5 w-3.5" />
              {t("previewStart")}
            </Button>
          )}

          {/* Production controls */}
          {isProdRunning ? (
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

          <Button size="sm" variant="outline" onClick={() => doAction("publish")} disabled={loading}>
            <Upload className="h-3.5 w-3.5" />
            {t("publish")}
          </Button>

          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Content: Chat + Preview + Deployments */}
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

        {/* Right Column: Tabbed panels */}
        <div className="flex flex-1 lg:flex-none lg:w-[480px] flex-col min-h-0">
          {/* Panel tabs */}
          <div className="flex items-center border-b bg-muted/40 rounded-t-lg">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanel === "preview"
                  ? "text-foreground bg-background border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRightPanel("preview")}
            >
              <Globe className="h-3 w-3" />
              {t("preview")}
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanel === "deploy"
                  ? "text-foreground bg-background border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRightPanel("deploy")}
            >
              <Server className="h-3 w-3" />
              {t("deployments")}
              {currentDeployment && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  v{currentDeployment.version}
                </Badge>
              )}
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                rightPanel === "files"
                  ? "text-foreground bg-background border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setRightPanel("files")}
            >
              <FolderOpen className="h-3 w-3" />
              {t("fileManager")}
            </button>
          </div>

          {/* Preview Panel */}
          {rightPanel === "preview" && (
            <div className="flex flex-1 flex-col rounded-b-lg border border-t-0 overflow-hidden bg-background min-h-0">
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

              {/* Bottom toolbar — Dev Logs / Console tabs */}
              {renderBottomToolbar(bottomPanel, setBottomPanel, bottomPanelCollapsed, setBottomPanelCollapsed)}

              {/* Bottom panel content */}
              {!bottomPanelCollapsed && bottomPanel === "logs" && renderLogPanel()}
              {!bottomPanelCollapsed && bottomPanel === "console" && renderConsolePanel()}
            </div>
          )}

          {/* Deployments Panel */}
          {rightPanel === "deploy" && (
            <div className="flex flex-1 flex-col rounded-b-lg border border-t-0 overflow-hidden bg-background min-h-0">
              {/* Deploy sub-tabs */}
              <div className="flex items-center border-b bg-muted/40">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    deployPanel === "systemLog"
                      ? "text-foreground bg-background border-t-2 border-primary -mt-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDeployPanel(deployPanel === "systemLog" ? null : "systemLog")}
                >
                  <Terminal className="h-3 w-3" />
                  {t("systemLog")}
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    deployPanel === "buildLog"
                      ? "text-foreground bg-background border-t-2 border-primary -mt-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDeployPanel(deployPanel === "buildLog" ? null : "buildLog")}
                >
                  <Terminal className="h-3 w-3" />
                  {t("buildLog")}
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    deployPanel === "history"
                      ? "text-foreground bg-background border-t-2 border-primary -mt-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDeployPanel(deployPanel === "history" ? null : "history")}
                >
                  <History className="h-3 w-3" />
                  {t("deploymentHistory")}
                </button>
              </div>

              {/* Deploy panel content */}
              {deployPanel === "systemLog" ? (
                <div className="flex-1 overflow-auto bg-muted/20">
                  {isProdRunning ? (
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {prodLogs || "No logs available"}
                      <div ref={prodLogsEndRef} />
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      {t("noDeployments")}
                    </div>
                  )}
                </div>
              ) : deployPanel === "buildLog" ? (
                <div className="flex-1 overflow-auto bg-muted/20">
                  {loading && (app?.status === "building" || rollingBack) && buildOutput === null ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                      <RotateCw className="h-3 w-3 animate-spin" />
                      <span>{rollingBack ? t("rollingBack") : `${t("building")}...`}</span>
                    </div>
                  ) : buildOutput ? (
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">{buildOutput}</pre>
                  ) : currentDeployment?.buildLog ? (
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">{currentDeployment.buildLog}</pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      {t("noDeployments")}
                    </div>
                  )}
                </div>
              ) : deployPanel === "history" ? (
                <div className="flex-1 overflow-auto bg-muted/20">
                  {deployments.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      {t("noDeployments")}
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">{t("version")}</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">{t("status")}</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">{t("deployedAt")}</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deployments.map((d) => (
                          <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-mono">
                              v{d.version}
                              {d.status === "running" && (
                                <Badge variant="success" className="ml-2 text-[10px] px-1 py-0">
                                  {t("currentVersion")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <Badge variant={statusVariant[d.status] || "secondary"} className="text-[10px]">
                                {d.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {new Date(d.createdAt).toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {d.status !== "running" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleRollback(d.id)}
                                  disabled={loading || rollingBack}
                                >
                                  <Undo2 className="h-3 w-3 mr-1" />
                                  {t("rollback")}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  <p className="text-xs">{t("noDeployments")}</p>
                </div>
              )}
            </div>
          )}

          {/* Files Panel */}
          {rightPanel === "files" && (
            <FileManager appId={app.id} />
          )}
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
            {/* Bottom toolbar in fullscreen */}
            {renderBottomToolbar(fullscreenBottomPanel, setFullscreenBottomPanel, fullscreenPanelCollapsed, setFullscreenPanelCollapsed)}
            {!fullscreenPanelCollapsed && fullscreenBottomPanel === "logs" && renderLogPanel("h-48")}
            {!fullscreenPanelCollapsed && fullscreenBottomPanel === "console" && renderConsolePanel("h-48")}
          </div>
        </div>
      )}

    </div>
  );
}
