"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { AgentChatPanel } from "@/components/chat/agent-chat-panel";
import type { AgentRole } from "@/lib/agents/types";

interface ServiceRef {
  instanceId?: string;
  name?: string;
  type: string;
}

interface CreateAppAction {
  action: "create_app";
  name: string;
  template: string;
  description?: string;
  config?: Record<string, unknown>;
  requiredServices?: (string | ServiceRef)[];
  files?: Array<{ path: string; content: string }>;
  npmPackages?: string[];
}

export default function CreateAppPage() {
  const t = useTranslations("create");
  const tAgents = useTranslations("agents");
  const [previewPort, setPreviewPort] = useState<number | null>(null);
  const [creatingApp, setCreatingApp] = useState(false);
  const [serviceWarning, setServiceWarning] = useState<string | null>(null);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  // Load allowed services for this org
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((org) => {
        if (org.allowedServices) {
          const enabled = org.allowedServices
            .filter((s: { enabled: boolean }) => s.enabled)
            .map((s: { serviceType: string }) => s.serviceType);
          setAllowedServices(enabled);
        }
      })
      .catch(() => {});
  }, []);

  // Create a pipeline on mount
  useEffect(() => {
    fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((pipeline) => setPipelineId(pipeline.id))
      .catch(() => {});
  }, []);

  const handleCreateApp = useCallback(
    async (action: CreateAppAction) => {
      if (action.requiredServices && action.requiredServices.length > 0) {
        // requiredServices can be strings or objects with a type field
        const getServiceType = (s: string | ServiceRef): string =>
          typeof s === "string" ? s : s.type;
        const unauthorized = action.requiredServices.filter(
          (s) => !allowedServices.includes(getServiceType(s))
        );
        if (unauthorized.length > 0) {
          const names = unauthorized.map((s) =>
            typeof s === "string" ? s : s.name || s.type
          );
          setServiceWarning(
            `${t("serviceNotAuthorized")}: ${names.join(", ")}`
          );
          return;
        }
      }

      setCreatingApp(true);
      setServiceWarning(null);
      try {
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.name,
            template: action.template,
            description: action.description || "",
            config: action.config || {},
            files: action.files,
            npmPackages: action.npmPackages,
          }),
        });

        if (!res.ok) throw new Error("Failed to create app");

        const app = await res.json();

        const genRes = await fetch(`/api/apps/${app.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-start" }),
        });

        if (genRes.ok) {
          const { port } = await genRes.json();
          setPreviewPort(port || app.port);
        }
      } catch {
        // Error handled via chat message
      } finally {
        setCreatingApp(false);
      }
    },
    [allowedServices, t]
  );

  const handleAssistantResponse = useCallback(
    (content: string, agentRole?: AgentRole) => {
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "create_app") {
          handleCreateApp(parsed as CreateAppAction);
        }
      } catch {}
    },
    [handleCreateApp]
  );

  const handleOrchestrationUpdate = useCallback(() => {
    // Could trigger additional actions based on orchestration state changes
  }, []);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAgents("subtitle")}</p>
      </div>

      {serviceWarning && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{serviceWarning}</span>
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Chat Panel */}
        <div className="flex flex-1 flex-col">
          <AgentChatPanel
            placeholder={t("placeholder")}
            emptyStateText={tAgents("emptyState")}
            generatingText={t("generating")}
            totalTokensLabel={t("totalTokens")}
            externalLoading={creatingApp}
            onAssistantResponse={handleAssistantResponse}
            onOrchestrationUpdate={handleOrchestrationUpdate}
            pipelineId={pipelineId || undefined}
            showProgress={true}
          />
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:flex w-1/2">
          <Card className="flex flex-1 flex-col overflow-hidden">
            {previewPort ? (
              <iframe
                src={`http://localhost:${previewPort}`}
                className="flex-1 w-full border-0"
                title="App Preview"
              />
            ) : (
              <CardContent className="flex flex-1 items-center justify-center text-center text-muted-foreground">
                <div>
                  <p className="text-lg font-medium">{t("preview")}</p>
                  <p className="text-sm mt-1">{tAgents("previewHint")}</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
