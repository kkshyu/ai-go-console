"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  RotateCw,
  Upload,
  Trash2,
  Globe,
  ArrowLeft,
  Terminal,
  Maximize2,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { AgentChatPanel, type AgentMessage } from "@/components/chat/agent-chat-panel";
import type { AgentRole } from "@/lib/agents/types";

interface AppData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  status: string;
  port: number | null;
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
  const [showLogs, setShowLogs] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

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

  async function doAction(action: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "logs") {
        setLogs(data.logs || "No logs");
        setShowLogs(true);
      }
      const appRes = await fetch(`/api/apps/${appId}`);
      setApp(await appRes.json());
    } catch (err) {
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

  function copyUrl() {
    if (!previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Template & Port */}
        <span className="text-xs text-muted-foreground font-mono">{app.template}</span>
        {app.port && (
          <>
            <span className="text-xs text-muted-foreground">:</span>
            <span className="text-xs text-muted-foreground font-mono">{app.port}</span>
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

          <Button size="sm" variant="outline" onClick={() => doAction("logs")} disabled={loading}>
            <Terminal className="h-3.5 w-3.5" />
          </Button>

          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Logs overlay */}
      {showLogs && (
        <div className="mb-3 relative">
          <div className="rounded-lg border bg-muted">
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <span className="text-xs font-medium">Logs</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLogs(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">
              {logs || "No logs available"}
            </pre>
          </div>
        </div>
      )}

      {/* Main Content: Chat + Preview */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Multi-Agent Chat Panel */}
        <div className="flex flex-1 flex-col min-h-0">
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

        {/* Preview Panel — browser-like chrome */}
        <div className="hidden lg:flex lg:w-[480px] flex-col min-h-0">
          {hasPreview ? (
            <div className="flex flex-1 flex-col rounded-lg border overflow-hidden bg-background">
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
            </div>
          ) : (
            <div className="flex flex-1 flex-col rounded-lg border overflow-hidden bg-background">
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
              src={`http://localhost:${app.port}`}
              className="flex-1 w-full border-0"
              title="App Preview Fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
}
