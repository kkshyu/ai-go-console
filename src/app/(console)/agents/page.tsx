"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Activity,
  Pause,
  Play,
  AlertCircle,
  XCircle,
  Info,
  AlertTriangle,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ActorState {
  id: string;
  role: string;
  status: "idle" | "processing" | "waiting" | "dead" | "restarting";
  lastHeartbeat: number;
  restartCount: number;
  maxRestarts: number;
}

interface SessionSnapshot {
  id: string;
  userId?: string;
  appId?: string;
  conversationId: string;
  startedAt: number;
  model: string;
  traceId?: string;
  actors: ActorState[];
  actorCount: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  avgProcessingTimeMs?: number;
  oldestWaitingAgeMs?: number;
}

interface ActivityEvent {
  id: string;
  timestamp: number;
  source: "actor" | "queue" | "system";
  level: "info" | "warn" | "error";
  actorId?: string;
  traceId?: string;
  queueName?: string;
  jobId?: string;
  message: string;
  failedReason?: string;
  meta?: Record<string, string | number | boolean>;
}

interface ArchiveStatus {
  archived?: number;
  skipped?: string;
  error?: string;
}

interface ObservabilityResponse {
  sessions: SessionSnapshot[];
  queues: Record<string, QueueStats>;
  activityFeed: ActivityEvent[];
  archiveStatus: ArchiveStatus;
  meta: { timestamp: number; sessionCount: number; activityCount: number };
}

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "secondary" | "default" | "warning" | "destructive"> = {
  idle: "secondary",
  processing: "default",
  waiting: "warning",
  dead: "destructive",
  restarting: "warning",
};

const SOURCE_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  actor: "default",
  queue: "secondary",
  system: "outline",
};

const REFRESH_INTERVALS = [1, 3, 5, 10];

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(startedAt: number): string {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatHeartbeat(timestamp: number): string {
  if (!timestamp) return "-";
  const ago = Math.floor((Date.now() - timestamp) / 1000);
  if (ago < 5) return "just now";
  if (ago < 60) return `${ago}s ago`;
  return `${Math.floor(ago / 60)}m ago`;
}

function formatTimeAgo(timestamp: number): string {
  const ago = Math.floor((Date.now() - timestamp) / 1000);
  if (ago < 5) return "just now";
  if (ago < 60) return `${ago}s ago`;
  if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
  return `${Math.floor(ago / 3600)}h ago`;
}

function LevelIcon({ level }: { level: string }) {
  switch (level) {
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case "warn":
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const t = useTranslations("agents");
  const [data, setData] = useState<ObservabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [errorsOnly, setErrorsOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (errorsOnly) params.set("level", "error");

      const res = await fetch(`/api/agents/observability?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // Silently fail — dashboard shows stale data
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, errorsOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {t("lastUpdated")}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1 rounded-md border px-2 py-1">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-muted-foreground hover:text-foreground"
              title={t("autoRefresh")}
            >
              {autoRefresh ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-xs text-muted-foreground outline-none"
            >
              {REFRESH_INTERVALS.map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Active Orchestration Sessions */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{t("activeSessions")}</h2>
        {!data?.sessions?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-40" />
              <p>{t("noActiveSessions")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">{session.id}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{session.model}</Badge>
                      {session.traceId && (
                        <span className="font-mono text-[10px] opacity-60" title={session.traceId}>
                          {session.traceId.slice(0, 16)}...
                        </span>
                      )}
                      <span>
                        {t("elapsed")}: {formatElapsed(session.startedAt)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">{t("actorId")}</th>
                          <th className="pb-2 pr-4 font-medium">{t("role")}</th>
                          <th className="pb-2 pr-4 font-medium">{t("status")}</th>
                          <th className="pb-2 pr-4 font-medium">{t("lastHeartbeat")}</th>
                          <th className="pb-2 font-medium">{t("restartCount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.actors.map((actor) => (
                          <tr key={actor.id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-mono text-xs">{actor.id}</td>
                            <td className="py-2 pr-4 capitalize">{actor.role}</td>
                            <td className="py-2 pr-4">
                              <Badge variant={STATUS_VARIANT[actor.status] || "secondary"}>
                                {t(
                                  `status${actor.status.charAt(0).toUpperCase()}${actor.status.slice(1)}` as Parameters<typeof t>[0],
                                )}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground text-xs">
                              {formatHeartbeat(actor.lastHeartbeat)}
                            </td>
                            <td className="py-2">
                              {actor.restartCount > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  {actor.restartCount}/{actor.maxRestarts}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  0/{actor.maxRestarts}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Background Worker Queues */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{t("backgroundQueues")}</h2>
        {!data?.queues || Object.keys(data.queues).length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
              <p>{t("noQueues")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.queues).map(([name, stats]) => (
              <Card key={name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">
                    {name.replace(/-/g, " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("waiting")}</span>
                      <span className="font-medium">{stats.waiting}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("active")}</span>
                      <span className="font-medium text-blue-600">{stats.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("completed")}</span>
                      <span className="font-medium text-green-600">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("failed")}</span>
                      <span
                        className={`font-medium ${stats.failed > 0 ? "text-red-600" : ""}`}
                      >
                        {stats.failed}
                      </span>
                    </div>
                    {stats.avgProcessingTimeMs !== undefined && (
                      <div className="flex justify-between col-span-2 border-t pt-1 mt-1">
                        <span className="text-muted-foreground">{t("avgTime")}</span>
                        <span className="font-medium">{stats.avgProcessingTimeMs}ms</span>
                      </div>
                    )}
                    {stats.oldestWaitingAgeMs !== undefined && stats.oldestWaitingAgeMs > 0 && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">{t("backpressure")}</span>
                        <span
                          className={`font-medium ${stats.oldestWaitingAgeMs > 10000 ? "text-orange-600" : ""}`}
                        >
                          {formatElapsed(Date.now() - stats.oldestWaitingAgeMs)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Activity Feed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t("activityFeed")}</h2>
          <div className="flex items-center gap-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-md border bg-transparent px-2 py-1 text-xs outline-none"
            >
              <option value="all">{t("filterAll")}</option>
              <option value="actor">{t("filterActor")}</option>
              <option value="queue">{t("filterQueue")}</option>
              <option value="system">{t("filterSystem")}</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={errorsOnly}
                onChange={(e) => setErrorsOnly(e.target.checked)}
                className="rounded"
              />
              {t("errorsOnly")}
            </label>
          </div>
        </div>

        {!data?.activityFeed?.length ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
              <p>{t("noActivity")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium w-24">{t("time")}</th>
                      <th className="px-4 py-2 font-medium w-20">{t("source")}</th>
                      <th className="px-4 py-2 font-medium w-10"></th>
                      <th className="px-4 py-2 font-medium w-40">{t("actorOrQueue")}</th>
                      <th className="px-4 py-2 font-medium">{t("message")}</th>
                      <th className="px-4 py-2 font-medium w-32">{t("traceId")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activityFeed.map((event) => (
                      <tr
                        key={event.id}
                        className={`border-b last:border-0 ${
                          event.level === "error"
                            ? "bg-red-50 dark:bg-red-950/20"
                            : event.level === "warn"
                              ? "bg-orange-50/50 dark:bg-orange-950/10"
                              : ""
                        }`}
                      >
                        <td className="px-4 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(event.timestamp)}
                        </td>
                        <td className="px-4 py-1.5">
                          <Badge
                            variant={SOURCE_VARIANT[event.source] || "secondary"}
                            className="text-[10px]"
                          >
                            {event.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-1.5">
                          <LevelIcon level={event.level} />
                        </td>
                        <td className="px-4 py-1.5 font-mono text-xs truncate max-w-[160px]">
                          {event.actorId || event.queueName || "-"}
                        </td>
                        <td
                          className="px-4 py-1.5 text-xs truncate max-w-[400px]"
                          title={event.message}
                        >
                          {event.message}
                          {event.failedReason && (
                            <span className="text-red-500 ml-1" title={event.failedReason}>
                              — {event.failedReason.slice(0, 80)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {event.traceId ? event.traceId.slice(0, 16) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archive Status */}
        {data?.archiveStatus?.error && (
          <div className="flex items-center gap-2 mt-2 text-xs text-orange-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("archiveUnavailable")}
          </div>
        )}
        {data?.archiveStatus?.archived !== undefined && data.archiveStatus.archived > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {t("archivedEvents", { count: data.archiveStatus.archived })}
          </div>
        )}
      </section>
    </div>
  );
}
