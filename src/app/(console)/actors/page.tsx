"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Pause, Play } from "lucide-react";

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
  actors: ActorState[];
  actorCount: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface ActorStatusResponse {
  sessions: SessionSnapshot[];
  queues: Record<string, QueueStats>;
}

const STATUS_VARIANT: Record<string, "secondary" | "default" | "warning" | "destructive"> = {
  idle: "secondary",
  processing: "default",
  waiting: "warning",
  dead: "destructive",
  restarting: "warning",
};

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

const REFRESH_INTERVALS = [1, 3, 5, 10];

export default function ActorsPage() {
  const t = useTranslations("actors");
  const [data, setData] = useState<ActorStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/actors/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // Silently fail — dashboard will show stale data
    } finally {
      setLoading(false);
    }
  }, []);

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
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
                    <CardTitle className="text-sm font-mono">
                      {session.id}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{session.model}</Badge>
                      <span>{t("elapsed")}: {formatElapsed(session.startedAt)}</span>
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
                                {t(`status${actor.status.charAt(0).toUpperCase()}${actor.status.slice(1)}` as Parameters<typeof t>[0])}
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
                                <span className="text-muted-foreground">0/{actor.maxRestarts}</span>
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
                  <CardTitle className="text-sm capitalize">{name.replace(/-/g, " ")}</CardTitle>
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
                      <span className={`font-medium ${stats.failed > 0 ? "text-red-600" : ""}`}>
                        {stats.failed}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
