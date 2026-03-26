"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface AppData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  status: string;
  port: number | null;
  domains: Array<{ id: string; domain: string; isActive: boolean }>;
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

  useEffect(() => {
    fetch(`/api/apps/${appId}`)
      .then((res) => res.json())
      .then(setApp);
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
      // Refresh app data
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

  if (!app) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/apps")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
          {app.description && (
            <p className="text-muted-foreground mt-1">{app.description}</p>
          )}
        </div>
        <Badge variant={statusVariant[app.status] || "secondary"}>
          {t(app.status as "developing" | "running" | "stopped" | "building" | "error")}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("template")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{app.template}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("port")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{app.port || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("domain")}</CardTitle>
          </CardHeader>
          <CardContent>
            {app.domains.length > 0 ? (
              app.domains.map((d) => (
                <p key={d.id} className="font-mono text-sm">{d.domain}</p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("actions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {app.status === "developing" || app.status === "stopped" ? (
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

          {app.port && (app.status === "running" || app.status === "developing") && (
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
          <CardHeader>
            <CardTitle className="text-sm font-medium">Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
              {logs || "No logs available"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
