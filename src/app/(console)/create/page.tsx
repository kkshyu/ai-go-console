"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Loader2,
  DollarSign,
  Scale,
  Briefcase,
  Users,
  Megaphone,
  ClipboardList,
  Monitor,
  Package,
  Zap,
  MessageSquare,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "@/components/chat/chat-panel";

type CreateMode = "quick" | "chat";

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

interface AppPreset {
  id: string;
  category: string;
  template: string;
}

const APP_PRESETS: AppPreset[] = [
  { id: "finance-expense-report", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-invoice-manager", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-budget-tracker", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-accounts-receivable", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-accounts-payable", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-payroll", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-tax-filing", category: "finance", template: "nextjs-fullstack" },
  { id: "finance-cashflow", category: "finance", template: "nextjs-fullstack" },
  { id: "linebot-payment-notify", category: "finance", template: "line-bot" },
  { id: "legal-contract-manager", category: "legal", template: "nextjs-fullstack" },
  { id: "legal-case-tracker", category: "legal", template: "nextjs-fullstack" },
  { id: "legal-compliance-checklist", category: "legal", template: "nextjs-fullstack" },
  { id: "linebot-contract-alert", category: "legal", template: "line-bot" },
  { id: "sales-crm", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-quote-generator", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-lead-tracker", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-order-management", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-commission", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-visit-log", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-territory-map", category: "sales", template: "nextjs-fullstack" },
  { id: "sales-product-catalog", category: "sales", template: "nextjs-fullstack" },
  { id: "linebot-customer-service", category: "sales", template: "line-bot" },
  { id: "linebot-ecommerce", category: "sales", template: "line-bot" },
  { id: "linebot-order-tracking", category: "sales", template: "line-bot" },
  { id: "hr-leave-system", category: "hr", template: "nextjs-fullstack" },
  { id: "hr-recruitment", category: "hr", template: "nextjs-fullstack" },
  { id: "hr-onboarding", category: "hr", template: "nextjs-fullstack" },
  { id: "linebot-leave", category: "hr", template: "line-bot" },
  { id: "marketing-campaign", category: "marketing", template: "nextjs-fullstack" },
  { id: "marketing-content-calendar", category: "marketing", template: "nextjs-fullstack" },
  { id: "linebot-member-card", category: "marketing", template: "line-bot" },
  { id: "linebot-survey", category: "marketing", template: "line-bot" },
  { id: "pm-task-board", category: "pm", template: "nextjs-fullstack" },
  { id: "pm-meeting-notes", category: "pm", template: "nextjs-fullstack" },
  { id: "linebot-notification", category: "pm", template: "line-bot" },
  { id: "it-helpdesk", category: "it", template: "nextjs-fullstack" },
  { id: "linebot-faq", category: "it", template: "line-bot" },
  { id: "ops-inventory", category: "ops", template: "nextjs-fullstack" },
  { id: "linebot-booking", category: "ops", template: "line-bot" },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  finance: DollarSign,
  legal: Scale,
  sales: Briefcase,
  hr: Users,
  marketing: Megaphone,
  pm: ClipboardList,
  it: Monitor,
  ops: Package,
};

const CATEGORIES = ["finance", "legal", "sales", "hr", "marketing", "pm", "it", "ops"];

export default function CreateAppPage() {
  const t = useTranslations("create");
  const router = useRouter();

  const [mode, setMode] = useState<CreateMode>("quick");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingPreset, setCreatingPreset] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);

  // Chat mode state
  const [creatingApp, setCreatingApp] = useState(false);
  const [serviceWarning, setServiceWarning] = useState<string | null>(null);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);
  const [serviceInstances, setServiceInstances] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const chatMessagesRef = useRef<{ role: string; content: string }[]>([]);

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
    // Also fetch service instances to resolve types to IDs
    fetch("/api/services")
      .then((r) => r.json())
      .then((services) => {
        if (Array.isArray(services)) {
          setServiceInstances(services.map((s: { id: string; name: string; type: string }) => ({
            id: s.id,
            name: s.name,
            type: s.type,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateApp = useCallback(
    async (action: CreateAppAction) => {
      // Resolve required services: check authorization and map types to instance IDs
      let serviceIds: string[] | undefined;
      if (action.requiredServices && action.requiredServices.length > 0) {
        const getServiceType = (s: string | ServiceRef): string =>
          typeof s === "string" ? s : s.type;
        const unauthorized = action.requiredServices.filter(
          (s) => !allowedServices.includes(getServiceType(s))
        );
        if (unauthorized.length > 0) {
          const names = unauthorized.map((s) =>
            typeof s === "string" ? s : s.name || s.type
          );
          setServiceWarning(`${t("serviceNotAuthorized")}: ${names.join(", ")}`);
          return;
        }

        // Resolve service types to instance IDs (prefer matching by instanceId if provided)
        const resolvedIds: string[] = [];
        const missingTypes: string[] = [];
        for (const svc of action.requiredServices) {
          if (typeof svc !== "string" && svc.instanceId) {
            resolvedIds.push(svc.instanceId);
          } else {
            const svcType = getServiceType(svc);
            const instance = serviceInstances.find((si) => si.type === svcType);
            if (instance) {
              resolvedIds.push(instance.id);
            } else {
              missingTypes.push(svcType);
            }
          }
        }
        if (missingTypes.length > 0) {
          setServiceWarning(`${t("serviceNotAuthorized")}: ${missingTypes.join(", ")}`);
          return;
        }
        serviceIds = resolvedIds;
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
            serviceIds,
          }),
        });
        if (!res.ok) throw new Error("Failed to create app");
        const app = await res.json();
        // Save creation chat messages to the app
        for (const msg of chatMessagesRef.current) {
          await fetch(`/api/apps/${app.id}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: msg.role, content: msg.content }),
          }).catch(() => {});
        }
        // Start dev server then navigate to app detail page with develop flag
        await fetch(`/api/apps/${app.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-start" }),
        }).catch(() => {});
        router.push(`/apps/${app.id}?develop=true`);
      } catch {
        // Error handled via chat message
      } finally {
        setCreatingApp(false);
      }
    },
    [allowedServices, serviceInstances, t, router]
  );

  const handleAssistantResponse = useCallback(
    (content: string) => {
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "create_app") handleCreateApp(parsed as CreateAppAction);
      } catch {}
    },
    [handleCreateApp]
  );

  const handleUserMessage = useCallback((content: string) => {
    chatMessagesRef.current.push({ role: "user", content });
  }, []);

  const handleAssistantComplete = useCallback((content: string) => {
    chatMessagesRef.current.push({ role: "assistant", content });
  }, []);

  const handlePresetCreate = useCallback(
    async (preset: AppPreset) => {
      if (creatingPreset) return;
      setCreatingPreset(preset.id);
      setPresetError(null);
      try {
        const name = t(`presets.${preset.id}.name`);
        const description = t(`presets.${preset.id}.description`);
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, template: preset.template, presetId: preset.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("createFailed"));
        }
        const app = await res.json();
        // Start the dev server inside the container
        await fetch(`/api/apps/${app.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dev-start" }),
        });
        router.push(`/apps/${app.id}?develop=true`);
      } catch (err) {
        setPresetError(err instanceof Error ? err.message : t("createFailed"));
        setCreatingPreset(null);
      }
    },
    [creatingPreset, t, router]
  );

  const filteredPresets = APP_PRESETS.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = t(`presets.${p.id}.name`).toLowerCase();
      const desc = t(`presets.${p.id}.description`).toLowerCase();
      return name.includes(query) || desc.includes(query);
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 grid grid-cols-2 gap-3 max-w-lg">
        <button
          onClick={() => setMode("quick")}
          className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
            mode === "quick"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-accent"
          }`}
        >
          <div className={`rounded-lg p-2 shrink-0 ${mode === "quick" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t("modeQuick")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("modeQuickDescription")}</p>
          </div>
        </button>

        <button
          onClick={() => setMode("chat")}
          className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
            mode === "chat"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-accent"
          }`}
        >
          <div className={`rounded-lg p-2 shrink-0 ${mode === "chat" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t("modeChat")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("modeChatDescription")}</p>
          </div>
        </button>
      </div>

      {/* Quick Create Mode */}
      {mode === "quick" && (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {presetError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {presetError}
            </div>
          )}
          <p className="text-sm text-muted-foreground">{t("quickCreate")}</p>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              {t("allCategories")}
            </Button>
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`presetCategories.${cat}`)}
                </Button>
              );
            })}
          </div>

          {/* Preset Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredPresets.map((preset) => {
              const Icon = CATEGORY_ICONS[preset.category];
              const isCreating = creatingPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetCreate(preset)}
                  disabled={!!creatingPreset}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:shadow-md hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="rounded-lg bg-muted p-2 shrink-0 mt-0.5">
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{t(`presets.${preset.id}.name`)}</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {t(`presetCategories.${preset.category}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                      {t(`presets.${preset.id}.description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Mode */}
      {mode === "chat" && (
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-1 flex-col min-h-0 max-w-3xl">
            {serviceWarning && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{serviceWarning}</span>
              </div>
            )}
            <ChatPanel
              placeholder={t("placeholder")}
              emptyStateText={t("chatEmptyState")}
              generatingText={t("generating")}
              totalTokensLabel={t("totalTokens")}
              externalLoading={creatingApp}
              onAssistantResponse={handleAssistantResponse}
              onUserMessage={handleUserMessage}
              onAssistantComplete={handleAssistantComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
