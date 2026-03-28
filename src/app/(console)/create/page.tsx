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
  Home,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
  { id: "realestate-listing", category: "realestate", template: "nextjs-fullstack" },
  { id: "realestate-client-matching", category: "realestate", template: "nextjs-fullstack" },
  { id: "realestate-commission", category: "realestate", template: "nextjs-fullstack" },
  { id: "realestate-owner-negotiation", category: "realestate", template: "nextjs-fullstack" },
  { id: "linebot-property-inquiry", category: "realestate", template: "line-bot" },
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
  realestate: Home,
};

const CATEGORIES = ["finance", "legal", "sales", "hr", "marketing", "pm", "it", "ops", "realestate"];

// Featured presets to show on the homepage (one per category for variety)
const FEATURED_PRESET_IDS = [
  "sales-crm",
  "finance-expense-report",
  "hr-leave-system",
  "pm-task-board",
  "marketing-campaign",
  "legal-contract-manager",
  "it-helpdesk",
  "ops-inventory",
];

export default function CreateAppPage() {
  const t = useTranslations("create");
  const router = useRouter();

  const [showChat, setShowChat] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Auto-select service instances when PRD updates
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
      // Use service instances selected in the right panel
      const serviceIds = Object.values(selectedServices).filter(Boolean);

      // Check for failed service tests
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
        // Inject PRD.md into initial files
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
      // Extract PRD data from response
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
          body: JSON.stringify({ name, description, template: preset.template, presetId: preset.id }),
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

  const featuredPresets = APP_PRESETS.filter((p) => FEATURED_PRESET_IDS.includes(p.id));

  const filteredPresets = APP_PRESETS.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    return true;
  });

  // When in full chat mode, show the chat interface
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
                if (e.key === "Enter" && !e.shiftKey) {
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
            {[t("suggestionCRM"), t("suggestionInvoice"), t("suggestionLeave")].map((suggestion) => (
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

      {/* Featured Templates */}
      {!showAllTemplates && (
        <div className="mx-auto w-full max-w-4xl px-4 pb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredPresets.map((preset) => {
              const Icon = CATEGORY_ICONS[preset.category];
              const isCreating = creatingPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetCreate(preset)}
                  disabled={!!creatingPreset}
                  className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/15 transition-colors">
                    {isCreating ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t(`presets.${preset.id}.name`)}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
                      {t(`presets.${preset.id}.description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllTemplates(true)}
              className="rounded-full gap-2"
            >
              {t("viewAllTemplates")}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* All Templates */}
      {showAllTemplates && (
        <div className="mx-auto w-full max-w-4xl px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("allTemplatesTitle")}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAllTemplates(false);
                setSelectedCategory(null);
              }}
              className="gap-1"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {t("collapse")}
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className="rounded-full"
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
                  className="rounded-full"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`presetCategories.${cat}`)}
                </Button>
              );
            })}
          </div>

          {/* All Preset Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPresets.map((preset) => {
              const Icon = CATEGORY_ICONS[preset.category];
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
                      <Badge variant="outline" className="text-xs font-normal">
                        {t(`presetCategories.${preset.category}`)}
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
      )}
    </div>
  );
}
