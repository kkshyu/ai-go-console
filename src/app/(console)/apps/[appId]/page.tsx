"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Zap,
  Maximize2,
  X,
} from "lucide-react";
import { AgentChatPanel, type AgentMessage } from "@/components/chat/agent-chat-panel";
import type { AgentRole, PipelineStage, PipelineState } from "@/lib/agents/types";
import { AVAILABLE_MODELS } from "@/lib/ai";
import type { TokenUsageMap } from "@/components/chat/chat-panel";

interface AppData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  status: string;
  port: number | null;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
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
  const tAgents = useTranslations("agents");
  const [app, setApp] = useState<AppData | null>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageMap>({});
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const isDevRunning = app?.status === "running" || app?.status === "developing";
  const hasPreview = app?.port && isDevRunning;

  const stageLabels: Record<PipelineStage, string> = {
    requirements: tAgents("stages.requirements"),
    architecture: tAgents("stages.architecture"),
    coding: tAgents("stages.coding"),
    review: tAgents("stages.review"),
    deployment: tAgents("stages.deployment"),
  };

  useEffect(() => {
    fetch(`/api/apps/${appId}`)
      .then((res) => res.json())
      .then(setApp);
    // Load chat history
    fetch(`/api/apps/${appId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setChatMessages(
            data.messages.map((m: { id: string; role: string; content: string; agent_role?: string; stage?: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              agentRole: m.agent_role as AgentRole | undefined,
              stage: m.stage as PipelineStage | undefined,
            }))
          );
        }
        setChatLoaded(true);
      })
      .catch(() => setChatLoaded(true));
    // Create pipeline for this app
    fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId }),
    })
      .then((r) => r.json())
      .then((pipeline) => setPipelineId(pipeline.id))
      .catch(() => {});
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
    async (role: string, content: string, agentRole?: AgentRole, stage?: PipelineStage) => {
      try {
        await fetch(`/api/apps/${appId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content, agentRole, stage }),
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

  const handleTokenUsageChange = useCallback((usage: TokenUsageMap) => {
    setTokenUsage(usage);
  }, []);

  if (!app) return <div className="p-8">Loading...</div>;

  const totalTokens = Object.values(tokenUsage).reduce(
    (sum, u) => sum + u.totalTokens,
    0
  );

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/apps")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{app.name}</h1>
          {app.description && (
            <p className="text-muted-foreground mt-1">{app.description}</p>
          )}
        </div>
        <Badge variant={statusVariant[app.status] || "secondary"}>
          {t(app.status as "developing" | "running" | "stopped" | "building" | "error")}
        </Badge>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Panel */}
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
              pipelineId={pipelineId || undefined}
              showPipeline={true}
              stageLabels={stageLabels}
            />
          )}
        </div>

        {/* App Info Panel */}
        <div className="hidden lg:flex lg:w-[400px] flex-col gap-4 overflow-y-auto">
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("template")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm">{app.template}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("port")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm">{app.port || "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Token Usage Card */}
          {totalTokens > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  {t("tokenUsage")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("totalTokens")}</span>
                    <span className="font-mono font-medium">{formatTokenCount(totalTokens)}</span>
                  </div>
                  {Object.entries(tokenUsage).map(([modelId, usage]) => {
                    const label =
                      AVAILABLE_MODELS.find((m) => m.id === modelId)?.label ??
                      modelId.split("/").pop();
                    return (
                      <div key={modelId} className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{label}</span>
                          <span className="font-mono">{formatTokenCount(usage.totalTokens)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("promptTokens")}</span>
                          <span className="font-mono">{formatTokenCount(usage.promptTokens)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("completionTokens")}</span>
                          <span className="font-mono">{formatTokenCount(usage.completionTokens)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("actions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {app.status === "developing" && !hasPreview ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => doAction("dev-start")}
                    disabled={loading}
                  >
                    <Play className="h-4 w-4" />
                    Dev {t("start")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => doAction("publish")}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {t("publish")}
                  </Button>
                </>
              ) : app.status === "developing" && hasPreview ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doAction("dev-stop")}
                    disabled={loading}
                  >
                    <Square className="h-4 w-4" />
                    {t("devStop")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => doAction("publish")}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {t("publish")}
                  </Button>
                </>
              ) : app.status === "stopped" ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => doAction("dev-start")}
                    disabled={loading}
                  >
                    <Play className="h-4 w-4" />
                    Dev {t("start")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => doAction("publish")}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {t("publish")}
                  </Button>
                </>
              ) : app.status === "running" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doAction("stop")}
                    disabled={loading}
                  >
                    <Square className="h-4 w-4" />
                    {t("stop")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doAction("restart")}
                    disabled={loading}
                  >
                    <RotateCw className="h-4 w-4" />
                    {t("restart")}
                  </Button>
                </>
              ) : null}

              <Button
                size="sm"
                variant="outline"
                onClick={() => doAction("logs")}
                disabled={loading}
              >
                <Terminal className="h-4 w-4" />
                {t("viewLogs")}
              </Button>

              {hasPreview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`http://localhost:${app.port}`, "_blank")}
                >
                  <Globe className="h-4 w-4" />
                  Open
                </Button>
              )}

              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </Button>
            </CardContent>
          </Card>

          {showLogs && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
                  {logs || "No logs available"}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Preview iframe when app is running */}
          {hasPreview ? (
            <Card className="flex-1 min-h-[300px] overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{t("preview")}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPreviewFullscreen(true)}
                  title={t("fullscreen")}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <iframe
                  src={`http://localhost:${app.port}`}
                  className="w-full h-[400px] border-0"
                  title="App Preview"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 min-h-[200px] overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("preview")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Globe className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t("serverNotRunning")}</p>
                <p className="text-xs mt-1">{t("startDevServer")}</p>
              </CardContent>
            </Card>
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
