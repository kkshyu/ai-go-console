"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppWindow, Server, Play, PlusCircle, Globe } from "lucide-react";

interface AppItem {
  id: string;
  name: string;
  slug: string;
  template: string;
  status: string;
  port: number | null;
}

interface Stats {
  totalApps: number;
  runningApps: number;
  services: number;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  developing: "warning",
  running: "success",
  stopped: "secondary",
  building: "warning",
  error: "destructive",
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tApps = useTranslations("apps");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalApps: 0,
    runningApps: 0,
    services: 0,
  });

  useEffect(() => {
    // Fetch apps
    fetch("/api/apps")
      .then((res) => res.json())
      .then((data: AppItem[]) => {
        setApps(data);
        setStats((prev) => ({
          ...prev,
          totalApps: data.length,
          runningApps: data.filter(
            (a) => a.status === "running" || a.status === "developing"
          ).length,
        }));
      })
      .catch(() => {});

    // Fetch services count
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: unknown[]) => {
        setStats((prev) => ({ ...prev, services: data.length }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalApps")}
            </CardTitle>
            <AppWindow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("runningApps")}
            </CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.runningApps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("services")}
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.services}</div>
          </CardContent>
        </Card>
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AppWindow className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              {t("emptyState")}
            </p>
            <Link href="/create">
              <Button>
                <PlusCircle className="h-4 w-4" />
                {t("emptyStateAction")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("recentApps")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.slice(0, 6).map((app) => (
              <Link key={app.id} href={`/apps/${app.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{app.name}</h3>
                      <Badge variant={statusVariant[app.status] || "secondary"}>
                        {tApps(app.status as "developing" | "running" | "stopped" | "building" | "error")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">{app.template}</span>
                      {app.port && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          :{app.port}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
