"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, AppWindow, Globe, ServerCog } from "lucide-react";

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

export default function AppsPage() {
  const t = useTranslations("apps");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/apps")
      .then((res) => res.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Link key={app.id} href={`/apps/${app.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{app.name}</h3>
                    <Badge variant={statusVariant[app.status] || "secondary"}>
                      {t(app.status as "developing" | "running" | "stopped" | "building" | "error")}
                    </Badge>
                  </div>
                  {app.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {app.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono">{app.template}</span>
                    {app.port && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        :{app.port}
                      </span>
                    )}
                  </div>
                  {app.services && app.services.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <ServerCog className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {app.services.map((as) => (
                        <Badge key={as.service.id} variant="outline" className="text-xs font-normal">
                          {as.service.name}
                          <span className="ml-1 text-muted-foreground">{as.service.type}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
