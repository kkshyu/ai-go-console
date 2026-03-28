"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Loader2,
  Users,
  Package,
  MessageCircle,
  Globe,
  ShoppingCart,
  Calendar,
  Building2,
  BarChart3,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { PRDPanel } from "@/components/chat/prd-panel";
import { extractPRD, prdToMarkdown, type PRDData } from "@/lib/prd";

interface ServiceRef {
  instanceId?: string;
  name?: string;
  type: string;
}

interface CreateAppAction {
  action: "create_app";
  name: string;
  slug?: string;
  template: string;
  description?: string;
  config?: Record<string, unknown>;
  requiredServices?: (string | ServiceRef)[];
  files?: Array<{ path: string; content: string }>;
  npmPackages?: string[];
}

interface AppPreset {
  id: string;
  templateId: string;
}

/* ---------- System templates (categories) ---------- */

const SYSTEM_TEMPLATES = [
  "crm", "erp", "linebot", "website", "ecommerce", "booking", "internal", "dashboard",
] as const;

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  crm: Users,
  erp: Package,
  linebot: MessageCircle,
  website: Globe,
  ecommerce: ShoppingCart,
  booking: Calendar,
  internal: Building2,
  dashboard: BarChart3,
};

/* ---------- Presets organized by template ---------- */

const APP_PRESETS: AppPreset[] = [
  // CRM
  { id: "crm-sales-pipeline", templateId: "crm" },
  { id: "crm-realestate", templateId: "crm" },
  { id: "crm-client-portal", templateId: "crm" },
  // ERP
  { id: "erp-retail", templateId: "erp" },
  { id: "erp-realestate", templateId: "erp" },
  { id: "erp-accounting", templateId: "erp" },
  // LINE Bot
  { id: "linebot-customer-service", templateId: "linebot" },
  { id: "linebot-booking", templateId: "linebot" },
  { id: "linebot-order-notify", templateId: "linebot" },
  { id: "linebot-membership", templateId: "linebot" },
  // Website
  { id: "website-corporate", templateId: "website" },
  { id: "website-portfolio", templateId: "website" },
  { id: "website-realestate", templateId: "website" },
  // E-commerce
  { id: "ecommerce-storefront", templateId: "ecommerce" },
  { id: "ecommerce-order-mgmt", templateId: "ecommerce" },
  // Booking
  { id: "booking-appointment", templateId: "booking" },
  { id: "booking-restaurant", templateId: "booking" },
  // Internal
  { id: "internal-hr", templateId: "internal" },
  { id: "internal-project", templateId: "internal" },
  { id: "internal-helpdesk", templateId: "internal" },
  // Dashboard
  { id: "dashboard-analytics", templateId: "dashboard" },
];

export default function CreateAppPage() {
  const t = useTranslations("create");
  const router = useRouter();

  const [showChat, setShowChat] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creatingPreset, setCreatingPreset] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Chat mode state
  const [creatingApp, setCreatingApp] = useState(false);
  const [serviceWarning, setServiceWarning] = useState<string | null>(null);
  const [allowedServices, setAllowedServices] = useState<string[]>([]);
  const [serviceInstances, setServiceInstances] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const chatMessagesRef = useRef<{ role: string; content: string }[]>([]);
  const [prdData, setPrdData] = useState<PRDData | null>(null);
  const [selectedServices, setSelectedServices] = useState<Record<string, string>>({});
  const [serviceTestResults, setServiceTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const manuallySelectedRef = useRef<Set<string>>(new Set());

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

  const testService = useCallback(async (svcType: string, instanceId: string) => {
    setServiceTestResults((prev) => ({ ...prev, [svcType]: null }));
    try {
      const res = await fetch(`/api/services/${instanceId}/test`, { method: "POST" });
      const data = await res.json();
      setServiceTestResults((prev) => ({ ...prev, [svcType]: data }));
    } catch {
      setServiceTestResults((prev) => ({ ...prev, [svcType]: { success: false, message: "Connection failed" } }));
    }
  }, []);

  const handleServiceChange = useCallback((svcType: string, instanceId: string) => {
    manuallySelectedRef.current.add(svcType);
    setSelectedServices((prev) => ({ ...prev, [svcType]: instanceId }));
    testService(svcType, instanceId);
  }, [testService]);

  const autoSelectServices = useCallback((prd: PRDData) => {
    const newSelected = { ...selectedServices };
    let changed = false;
    for (const svcType of prd.requiredServices) {
      if (manuallySelectedRef.current.has(svcType)) continue;
      if (newSelected[svcType]) continue;
      const instances = serviceInstances.filter((s) => s.type === svcType);
      if (instances.length > 0) {
        newSelected[svcType] = instances[0].id;
        changed = true;
        testService(svcType, instances[0].id);
      }
    }
    if (changed) setSelectedServices(newSelected);
  }, [selectedServices, serviceInstances, testService]);

  const handleCreateApp = useCallback(
    async (action: CreateAppAction) => {
      const serviceIds = Object.values(selectedServices).filter(Boolean);
      const failedServices = Object.entries(serviceTestResults)
        .filter(([, result]) => result && !result.success)
        .map(([svcType]) => {
          const instanceId = selectedServices[svcType];
          const inst = serviceInstances.find((si) => si.id === instanceId);
          return inst?.name || svcType;
        });
      if (failedServices.length > 0) {
        setServiceWarning(t("serviceConnectionFailed", { services: failedServices.join(", ") }));
        return;
      }
      setCreatingApp(true);
      setServiceWarning(null);
      try {
        const prdFile = prdData ? { path: "PRD.md", content: prdToMarkdown(prdData) } : null;
        const allFiles = [...(action.files || []), ...(prdFile ? [prdFile] : [])];
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.name,
            slug: action.slug,
            template: action.template,
            description: action.description || "",
            config: action.config || {},
            files: allFiles.length > 0 ? allFiles : undefined,
            npmPackages: action.npmPackages,
            serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to create app");
        const app = await res.json();
        for (const msg of chatMessagesRef.current) {
          await fetch(`/api/apps/${app.id}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: msg.role, content: msg.content }),
          }).catch(() => {});
        }
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
    [selectedServices, serviceTestResults, serviceInstances, prdData, t, router]
  );

  const handleAssistantResponse = useCallback(
    (content: string) => {
      const prd = extractPRD(content);
      if (prd) {
        setPrdData(prd);
        autoSelectServices(prd);
      }
      const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (!jsonMatch) return;
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === "create_app") handleCreateApp(parsed as CreateAppAction);
      } catch {}
    },
    [handleCreateApp, autoSelectServices]
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
          body: JSON.stringify({ name, description, presetId: preset.id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("createFailed"));
        }
        const app = await res.json();
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

  const handleInputSubmit = () => {
    if (!inputValue.trim()) return;
    setShowChat(true);
  };

  const filteredPresets = selectedTemplate
    ? APP_PRESETS.filter((p) => p.templateId === selectedTemplate)
    : APP_PRESETS;

  // Chat mode
  if (showChat) {
    return (
      <div className="flex h-[calc(100vh-7rem)] flex-col">
        <div className="mb-4">
          <button
            onClick={() => setShowChat(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {t("backToHome")}
          </button>
        </div>
        <div className="flex flex-1 min-h-0 gap-4">
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
              autoSend={!!inputValue.trim()}
              initialMessages={inputValue.trim() ? [{ id: "init-1", role: "user", content: inputValue.trim() }] : []}
            />
          </div>
          <PRDPanel
            prdData={prdData}
            requiredServiceTypes={prdData?.requiredServices || []}
            serviceInstances={serviceInstances}
            allowedServices={allowedServices}
            selectedServices={selectedServices}
            onServiceChange={handleServiceChange}
            serviceTestResults={serviceTestResults}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col overflow-y-auto">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6 md:pt-16 md:pb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          {t("heroBadge")}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-center max-w-2xl leading-tight">
          {t("heroTitle")}
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground text-center max-w-lg">
          {t("heroSubtitle")}
        </p>
      </div>

      {/* AI Input Box */}
      <div className="mx-auto w-full max-w-2xl px-4 mb-10">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card shadow-md hover:shadow-lg focus-within:shadow-lg transition-all p-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleInputSubmit();
                }
              }}
              placeholder={t("heroInputPlaceholder")}
              className="flex-1 bg-transparent border-0 outline-none px-3 py-2.5 text-base placeholder:text-muted-foreground/60"
            />
            <Button
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {[t("suggestionCRM"), t("suggestionEcommerce"), t("suggestionBooking")].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInputValue(suggestion);
                  setShowChat(true);
                }}
                className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto w-full max-w-4xl px-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">{t("orChooseTemplate")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {presetError && (
        <div className="mx-auto max-w-4xl px-4 mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {presetError}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mx-auto w-full max-w-4xl px-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedTemplate === null ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedTemplate(null)}
          >
            {t("allCategories")}
          </Button>
          {SYSTEM_TEMPLATES.map((tmplId) => {
            const Icon = TEMPLATE_ICONS[tmplId];
            return (
              <Button
                key={tmplId}
                variant={selectedTemplate === tmplId ? "default" : "outline"}
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => setSelectedTemplate(selectedTemplate === tmplId ? null : tmplId)}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`templates.${tmplId}.name`)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Preset Cards */}
      <div className="mx-auto w-full max-w-4xl px-4 pb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPresets.map((preset) => {
            const Icon = TEMPLATE_ICONS[preset.templateId];
            const isCreating = creatingPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetCreate(preset)}
                disabled={!!creatingPreset}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="rounded-lg bg-primary/10 p-2 shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors">
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{t(`presets.${preset.id}.name`)}</span>
                    <Badge variant="outline" className="text-xs font-normal shrink-0">
                      {t(`templates.${preset.templateId}.name`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                    {t(`presets.${preset.id}.description`)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
