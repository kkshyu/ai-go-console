"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Play,
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
  ArrowLeftRight,
  Loader2,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { AgentChatPanel, type AgentMessage } from "@/components/chat/agent-chat-panel";
import { FileManager } from "@/components/file-manager/file-manager";
import type { AgentRole, OrchestrationState } from "@/lib/agents/types";

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
  orgSlug: string;
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
  importing: "warning",
};

interface ImportStepData {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

interface ImportProgressDetail {
  steps: ImportStepData[];
  currentFile?: string;
  filesProcessed?: number;
  filesTotal?: number;
  autostartAttempt?: number;
  autostartMaxAttempts?: number;
  autostartErrors?: string[];
  filesFixed?: string[];
  fixExplanation?: string;
}

interface ImportSessionData {
  status: string;
  fileCount: number;
  errorMessage: string | null;
  progressMessage: string | null;
  progressDetail: ImportProgressDetail | null;
}

function formatDuration(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return remainSecs > 0 ? `${mins}m ${remainSecs}s` : `${mins}m`;
}

export default function AppDetailPage() {
  const { appId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("apps");
  const tc = useTranslations("common");
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
  const [bottomPanelHeight, setBottomPanelHeight] = useState(160); // default ~h-40
  const [fullscreenPanelHeight, setFullscreenPanelHeight] = useState(192); // default ~h-48
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef<"main" | "fullscreen">("main");
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const delta = dragStartYRef.current - e.clientY;
      const newHeight = Math.max(80, Math.min(600, dragStartHeightRef.current + delta));
      if (dragTargetRef.current === "main") {
        setBottomPanelHeight(newHeight);
      } else {
        setFullscreenPanelHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent, target: "main" | "fullscreen") => {
    isDraggingRef.current = true;
    dragTargetRef.current = target;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = target === "main" ? bottomPanelHeight : fullscreenPanelHeight;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };
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
  const [rightPanel, setRightPanel] = useState<"preview" | "deploy">("preview");
  const [fileManagerKey, setFileManagerKey] = useState(0);
  // Sub-panel for preview/deploy: browser view or file manager
  const [previewSubPanel, setPreviewSubPanel] = useState<"browser" | "files">("browser");
  const [deploySubPanel, setDeploySubPanel] = useState<"browser" | "files">("browser");
  const [prodIframeKey, setProdIframeKey] = useState(0);
  const [devPath, setDevPath] = useState("");
  const [devPathInput, setDevPathInput] = useState("");
  const [prodPath, setProdPath] = useState("");
  const [prodPathInput, setProdPathInput] = useState("");

  // Auto-develop: when redirected from /create with ?develop=true
  const isDevelop = searchParams.get("develop") === "true";
  const [conversationId] = useState<string>(() => `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [autoSendMessage, setAutoSendMessage] = useState<string | undefined>(undefined);
  const developInitRef = useRef(false);

  // Import session state for importing apps
  const [importSession, setImportSession] = useState<ImportSessionData | null>(null);
  const importPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dev server is running if we have a port and it's in developing state
  const [devRunning, setDevRunning] = useState(false);
  const hasPreview = app?.port && devRunning;

  // URL mode: "local" = localhost:port, "proxy" = {org}.dev.localhost/{slug} or {org}.localhost/{slug}
  const [previewUrlMode, setPreviewUrlMode] = useState<"local" | "proxy">("local");
  const [deployUrlMode, setDeployUrlMode] = useState<"local" | "proxy">("local");

  const devProxyUrl = app?.orgSlug ? `http://${app.orgSlug}.dev.localhost/${app.slug}` : null;
  const prodProxyUrl = app?.orgSlug ? `http://${app.orgSlug}.localhost/${app.slug}` : null;

  const previewUrl = hasPreview
    ? previewUrlMode === "proxy" && devProxyUrl
      ? devProxyUrl
      : `http://localhost:${app.port}`
    : null;

  // Production is running if app status is "running"
  const isProdRunning = app?.status === "running";
  const prodUrl = isProdRunning && app?.prodPort
    ? deployUrlMode === "proxy" && prodProxyUrl
      ? prodProxyUrl
      : `http://localhost:${app.prodPort}`
    : null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // Poll import session status when app is importing
  useEffect(() => {
    if (!app || app.status !== "importing") {
      if (importPollRef.current) {
        clearInterval(importPollRef.current);
        importPollRef.current = null;
      }
      return;
    }

    const fetchImportStatus = async () => {
      try {
        const res = await fetch(`/api/apps/import/session?appId=${appId}`);
        if (!res.ok) return;
        const data: ImportSessionData = await res.json();
        setImportSession(data);

        // If completed, refresh app data
        if (data.status === "completed" || data.status === "failed") {
          if (importPollRef.current) {
            clearInterval(importPollRef.current);
            importPollRef.current = null;
          }
          // Refresh app data to get the updated status
          const appRes = await fetch(`/api/apps/${appId}`);
          const appData = await appRes.json();
          setApp(appData);
        }
      } catch {
        // Ignore polling errors
      }
    };

    fetchImportStatus();
    importPollRef.current = setInterval(fetchImportStatus, 3000);
    return () => {
      if (importPollRef.current) {
        clearInterval(importPollRef.current);
        importPollRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when status changes, not on every app object update
  }, [app?.status, appId]);

  // Auto-develop: trigger multi-agent after chat and app data are loaded
  useEffect(() => {
    if (!isDevelop || !chatLoaded || !app || developInitRef.current) return;
    developInitRef.current = true;

    const message = app.description
      ? `以下是使用者的需求：\n\n${app.description}\n\n請根據以上需求開始開發此應用程式。`
      : "請根據上面的需求開始開發此應用程式。";
    setAutoSendMessage(message);
    // Clean up URL query param to prevent re-trigger on refresh
    router.replace(`/apps/${appId}`, { scroll: false });
  }, [isDevelop, chatLoaded, app, appId, router]);

  async function checkDevServerStatus(_slug: string) {
    try {
      const res = await fetch(`/api/apps/${appId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dev-status" }),
      });
      const data = await res.json();
      setDevRunning(data.running === true);
    } catch {
      // Fallback: check if dev-logs returns non-empty
      try {
        const res = await fetch(`/api/apps/${appId}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-logs" }),
        });
        const data = await res.json();
        setDevRunning(data.logs && data.logs.trim().length > 0);
      } catch {
        setDevRunning(false);
      }
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
        setBuildOutput(data.output || (data.error ? `${tc("error")}: ${data.error}` : t("buildCompleted")));
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
        setBuildOutput(t("buildFailed", { error: err instanceof Error ? err.message : "Unknown error" }));
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
      setBuildOutput(data.output || (data.error ? `${tc("error")}: ${data.error}` : t("rollbackCompleted")));
      fetchDeployments();
      const appRes = await fetch(`/api/apps/${appId}`);
      setApp(await appRes.json());
    } catch (err) {
      setBuildOutput(t("rollbackFailed", { error: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setRollingBack(false);
    }
  }

  async function handleDelete() {
    if (!confirm(tc("confirmAction"))) return;
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
    (content: string, _agentRole?: AgentRole) => {
      // Backend now handles file writes directly to Docker container.
      // Only handle update_app for metadata changes.
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

  const handleFilesWritten = useCallback(
    (_paths: string[]) => {
      // Refresh app data
      fetch(`/api/apps/${appId}`)
        .then((res) => res.json())
        .then(setApp)
        .catch(() => {});
      // Refresh file manager by forcing re-mount
      setFileManagerKey((k) => k + 1);
    },
    [appId]
  );

  const handleOrchestrationUpdate = useCallback(
    (state: OrchestrationState) => {
      if (state.status === "completed") {
        // Refresh app data
        fetch(`/api/apps/${appId}`)
          .then((res) => res.json())
          .then((data: AppData) => {
            setApp(data);
            checkDevServerStatus(data.slug);
          })
          .catch(() => {});
        // Refresh file manager
        setFileManagerKey((k) => k + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSlugError(data.error || t("slugUpdateFailed"));
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
    dragTarget: "main" | "fullscreen" = "main",
  ) {
    return (
      <>
        {/* Drag handle for resizing */}
        {panel && !collapsed && (
          <div
            className="h-1.5 w-full shrink-0 cursor-row-resize border-t hover:bg-primary/20 active:bg-primary/30 transition-colors"
            onMouseDown={(e) => startDrag(e, dragTarget)}
          />
        )}
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
      </>
    );
  }

  // Shared render: Ghostty-themed log panel
  function renderLogPanel(heightPx: number = 160) {
    return (
      <div
        className="overflow-auto font-mono text-xs"
        style={{ backgroundColor: "#1c1c1c", color: "#d4d4d4", height: `${heightPx}px` }}
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
  function renderConsolePanel(heightPx: number = 160) {
    return (
      <div className="overflow-auto text-xs font-mono border-t bg-white" style={{ height: `${heightPx}px` }}>
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

  if (!app) return <div className="p-8">{tc("loading")}</div>;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Title Bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.push("/apps")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight truncate">{app.name}</h1>
        <Badge variant={statusVariant[app.status] || "secondary"}>
          {t(app.status as "developing" | "running" | "stopped" | "building" | "error" | "importing")}
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
      </div>

      {/* Importing Progress Panel */}
      {app.status === "importing" && (
        <div className="flex flex-1 items-center justify-center min-h-0 overflow-auto">
          <div className="flex flex-col gap-5 p-8 w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary shrink-0" />
              <div>
                <h2 className="text-lg font-semibold">{t("importingTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {importSession?.progressMessage || t("importingWait")}
                </p>
              </div>
            </div>

            {/* Steps Timeline */}
            {importSession?.progressDetail?.steps && importSession.progressDetail.steps.length > 0 && (
              <div className="space-y-1">
                {importSession.progressDetail.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 py-2">
                    {/* Step icon */}
                    <div className="mt-0.5 shrink-0">
                      {step.status === "completed" ? (
                        <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                      ) : step.status === "running" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : step.status === "failed" ? (
                        <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center">
                          <X className="h-3 w-3 text-destructive" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          step.status === "pending" && "text-muted-foreground",
                          step.status === "completed" && "text-green-600",
                          step.status === "failed" && "text-destructive",
                        )}>
                          {step.label}
                        </span>
                        {step.status === "completed" && step.startedAt && step.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(step.startedAt, step.completedAt)}
                          </span>
                        )}
                      </div>
                      {step.detail && step.status !== "pending" && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File Progress */}
            {importSession?.progressDetail?.filesTotal != null && importSession.progressDetail.filesTotal > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">檔案處理進度</span>
                  <span className="font-mono font-medium">
                    {importSession.progressDetail.filesProcessed ?? 0} / {importSession.progressDetail.filesTotal}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.round(((importSession.progressDetail.filesProcessed ?? 0) / importSession.progressDetail.filesTotal) * 100)}%`,
                    }}
                  />
                </div>
                {importSession.progressDetail.currentFile && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {importSession.progressDetail.currentFile}
                  </p>
                )}
              </div>
            )}

            {/* Autostart Attempts */}
            {importSession?.progressDetail?.autostartAttempt != null && importSession.progressDetail.autostartAttempt > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    自動修復嘗試
                  </span>
                  <span className="font-mono font-medium">
                    第 {importSession.progressDetail.autostartAttempt} / {importSession.progressDetail.autostartMaxAttempts ?? 5} 次
                  </span>
                </div>
                {importSession.progressDetail.fixExplanation && (
                  <p className="text-xs text-muted-foreground">
                    {importSession.progressDetail.fixExplanation}
                  </p>
                )}
                {importSession.progressDetail.filesFixed && importSession.progressDetail.filesFixed.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">修復的檔案：</span>
                    <ul className="mt-1 space-y-0.5">
                      {importSession.progressDetail.filesFixed.map((f) => (
                        <li key={f} className="font-mono truncate">{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {importSession.progressDetail.autostartErrors && importSession.progressDetail.autostartErrors.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-destructive">偵測到的錯誤：</span>
                    <pre className="mt-1 p-2 rounded bg-muted text-[11px] leading-relaxed overflow-auto max-h-32 whitespace-pre-wrap break-all">
                      {importSession.progressDetail.autostartErrors.join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Footer status */}
            {importSession && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>{t("importingStatus")}</span>
                <Badge variant="outline">{importSession.status}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error with import session — show manual fix option */}
      {app.status === "error" && importSession?.status === "failed" && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">{t("importFailedTitle")}</p>
            <p className="text-xs text-muted-foreground truncate">
              {importSession.errorMessage || t("importFailedHint")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Open chat panel and send an initial fix request
              setChatCollapsed(false);
              setAutoSendMessage(
                `應用程式匯入後自動啟動失敗。請讀取 dev server 的錯誤日誌，分析問題並嘗試修復。錯誤訊息：${importSession.errorMessage || "未知錯誤"}`
              );
            }}
          >
            <Wrench className="h-3.5 w-3.5" />
            {t("importManualFix")}
          </Button>
        </div>
      )}

      {/* Main Content: Chat + Preview + Deployments */}
      <div className={`flex flex-1 gap-4 min-h-0 flex-col lg:flex-row ${app.status === "importing" ? "hidden" : ""}`}>
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
                onUserMessage={handleUserMessage}
                onAssistantComplete={handleAssistantComplete}
                onAssistantResponse={handleAssistantResponse}
                onFilesWritten={handleFilesWritten}
                onOrchestrationUpdate={handleOrchestrationUpdate}
                showProgress={true}
                conversationId={conversationId}
                autoSendMessage={autoSendMessage}
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
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="h-7 w-7 mr-1 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Preview Panel */}
          {rightPanel === "preview" && (
            <div className="flex flex-1 flex-col rounded-b-lg border border-t-0 overflow-hidden bg-background min-h-0">
              {hasPreview ? (
                <>
                  {/* Browser toolbar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
                    {/* Traffic lights — red is stop button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        className="h-3 w-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all disabled:opacity-50"
                        onClick={() => doAction("dev-stop")}
                        disabled={loading}
                        title={t("previewStop")}
                      />
                      <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                      <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                    </div>
                    {/* Address bar */}
                    <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 min-w-0">
                      <button
                        className={`shrink-0 rounded p-0.5 transition-colors ${previewSubPanel === "files" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setPreviewSubPanel(previewSubPanel === "files" ? "browser" : "files")}
                        title={t("fileManager")}
                      >
                        <FolderOpen className="h-3 w-3" />
                      </button>
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground shrink-0 select-none">
                        {previewUrl}
                      </span>
                      <input
                        className="flex-1 min-w-0 text-xs font-mono text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/40"
                        value={devPathInput}
                        onChange={(e) => setDevPathInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const p = devPathInput.startsWith("/") ? devPathInput : devPathInput ? `/${devPathInput}` : "";
                            setDevPath(p);
                            setIframeKey((k) => k + 1);
                          }
                        }}
                        placeholder="/"
                        spellCheck={false}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => {
                          setPreviewUrlMode((m) => m === "local" ? "proxy" : "local");
                          setIframeKey((k) => k + 1);
                        }}
                        title={previewUrlMode === "local" ? t("switchToTraefik") : t("switchToLocalhost")}
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => setIframeKey((k) => k + 1)}
                        title={tc("refresh")}
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
                      title={t("openInBrowser")}
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
                  {previewSubPanel === "files" ? (
                    <FileManager key={`dev-${fileManagerKey}`} appId={app.id} containerType="dev" />
                  ) : (
                    <iframe
                      key={iframeKey}
                      src={`${previewUrl || `http://localhost:${app.port}`}${devPath}`}
                      className="flex-1 w-full border-0"
                      title={t("appPreview")}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    onClick={() => doAction("dev-start")}
                    disabled={loading}
                  >
                    <Play className="h-4 w-4" />
                    {t("previewStart")}
                  </Button>
                </div>
              )}

              {/* Bottom toolbar — Dev Logs / Console tabs */}
              {renderBottomToolbar(bottomPanel, setBottomPanel, bottomPanelCollapsed, setBottomPanelCollapsed, "main")}

              {/* Bottom panel content */}
              {!bottomPanelCollapsed && bottomPanel === "logs" && renderLogPanel(bottomPanelHeight)}
              {!bottomPanelCollapsed && bottomPanel === "console" && renderConsolePanel(bottomPanelHeight)}
            </div>
          )}

          {/* Deployments Panel */}
          {rightPanel === "deploy" && (
            <div className="flex flex-1 flex-col rounded-b-lg border border-t-0 overflow-hidden bg-background min-h-0">
              {isProdRunning ? (
                <>
                  {/* Browser toolbar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
                    {/* Traffic lights */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        className="h-3 w-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all disabled:opacity-50"
                        onClick={() => doAction("stop")}
                        disabled={loading}
                        title={t("stop")}
                      />
                      <button
                        className="h-3 w-3 rounded-full bg-[#FEBC2E] hover:brightness-110 transition-all disabled:opacity-50"
                        onClick={() => doAction("restart")}
                        disabled={loading}
                        title={t("restart")}
                      />
                      <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                    </div>
                    {/* Address bar */}
                    <div className="flex flex-1 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 min-w-0">
                      <button
                        className={`shrink-0 rounded p-0.5 transition-colors ${deploySubPanel === "files" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setDeploySubPanel(deploySubPanel === "files" ? "browser" : "files")}
                        title={t("fileManager")}
                      >
                        <FolderOpen className="h-3 w-3" />
                      </button>
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground shrink-0 select-none">
                        {prodUrl || `http://localhost:${app.prodPort}`}
                      </span>
                      <input
                        className="flex-1 min-w-0 text-xs font-mono text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/40"
                        value={prodPathInput}
                        onChange={(e) => setProdPathInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const p = prodPathInput.startsWith("/") ? prodPathInput : prodPathInput ? `/${prodPathInput}` : "";
                            setProdPath(p);
                            setProdIframeKey((k) => k + 1);
                          }
                        }}
                        placeholder="/"
                        spellCheck={false}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => setProdIframeKey((k) => k + 1)}
                        title={tc("refresh")}
                      >
                        <RotateCw className="h-3 w-3" />
                      </Button>
                    </div>
                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => window.open(`http://localhost:${app.prodPort}`, "_blank")}
                      title={t("openInBrowser")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => doAction("publish")} disabled={loading}>
                      <Upload className="h-3 w-3" />
                      {t("publish")}
                    </Button>
                  </div>
                  {deploySubPanel === "files" ? (
                    <FileManager key={`prod-${fileManagerKey}`} appId={app.id} containerType="prod" />
                  ) : (
                    <iframe
                      key={prodIframeKey}
                      src={`${prodUrl || `http://localhost:${app.prodPort}`}${prodPath}`}
                      className="flex-1 w-full border-0"
                      title={t("productionPreview")}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    onClick={() => doAction("publish")}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {t("publish")}
                  </Button>
                  {deployments.length > 0 && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2"
                      onClick={() => doAction("start")}
                      disabled={loading}
                    >
                      <Play className="h-4 w-4" />
                      {t("start")}
                    </Button>
                  )}
                </div>
              )}

              {/* Bottom toolbar — deploy logs */}
              <div className="flex items-center border-t bg-muted/40">
                {/* Prod address bar */}
                {prodUrl && (
                  <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-0.5 min-w-0 mr-auto">
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                      {prodUrl}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => setDeployUrlMode((m) => m === "local" ? "proxy" : "local")}
                      title={deployUrlMode === "local" ? t("switchToTraefik") : t("switchToLocalhost")}
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => window.open(prodUrl, "_blank")}
                      title={t("openInBrowser")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
                <div className="flex-1" />
              </div>

              {/* Deploy panel content */}
              {deployPanel === "systemLog" && (
                <div className="max-h-48 overflow-auto bg-muted/20">
                  {isProdRunning ? (
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {prodLogs || "No logs available"}
                      <div ref={prodLogsEndRef} />
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                      {t("noDeployments")}
                    </div>
                  )}
                </div>
              )}
              {deployPanel === "buildLog" && (
                <div className="max-h-48 overflow-auto bg-muted/20">
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
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                      {t("noDeployments")}
                    </div>
                  )}
                </div>
              )}
              {deployPanel === "history" && (
                <div className="max-h-48 overflow-auto bg-muted/20">
                  {deployments.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
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
              )}
            </div>
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
              src={`${previewUrl || `http://localhost:${app.port}`}${devPath}`}
              className="flex-1 w-full border-0"
              title={t("appPreviewFullscreen")}
            />
            {/* Bottom toolbar in fullscreen */}
            {renderBottomToolbar(fullscreenBottomPanel, setFullscreenBottomPanel, fullscreenPanelCollapsed, setFullscreenPanelCollapsed, "fullscreen")}
            {!fullscreenPanelCollapsed && fullscreenBottomPanel === "logs" && renderLogPanel(fullscreenPanelHeight)}
            {!fullscreenPanelCollapsed && fullscreenBottomPanel === "console" && renderConsolePanel(fullscreenPanelHeight)}
          </div>
        </div>
      )}

    </div>
  );
}
