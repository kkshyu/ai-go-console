"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, AppWindow, Search, ServerCog } from "lucide-react";

interface AppService {
  service: { id: string; name: string; type: string };
}

interface AppItem {
  id: string;
  name: string;
  slug: string;
  template: string;
  status: string;
  port: number | null;
  description: string | null;
  services: AppService[];
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  developing: "warning",
  running: "success",
  stopped: "secondary",
  building: "warning",
  error: "destructive",
};

const ALL_STATUSES = ["developing", "stopped", "building", "running", "error"] as const;

export default function AppsPage() {
  const t = useTranslations("apps");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");

  useEffect(() => {
    fetch("/api/apps")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const templates = useMemo(
    () => [...new Set(apps.map((app) => app.template))],
    [apps]
  );

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesTemplate = templateFilter === "all" || app.template === templateFilter;
      return matchesSearch && matchesStatus && matchesTemplate;
    });
  }, [apps, searchQuery, statusFilter, templateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Link href="/create">
          <Button>
            <PlusCircle className="h-4 w-4" />
            {t("create")}
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      {!loading && apps.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchApps")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTemplates")}</SelectItem>
              {templates.map((tmpl) => (
                <SelectItem key={tmpl} value={tmpl}>
                  {tmpl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AppWindow className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No apps yet</p>
            <Link href="/create">
              <Button>
                <PlusCircle className="h-4 w-4" />
                {t("create")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {t("noResults")}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{app.name}</h3>
                    {app.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {app.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs font-normal">
                    {app.template}
                  </Badge>
                  {app.services && app.services.length > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <ServerCog className="h-3.5 w-3.5" />
                      {t("serviceCount", { count: app.services.length })}
                    </span>
                  )}
                  <Badge variant={statusVariant[app.status] || "secondary"} className="shrink-0">
                    {t(app.status as "developing" | "running" | "stopped" | "building" | "error")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
