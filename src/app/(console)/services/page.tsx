"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Plus, Trash2, TestTube, Pencil, Loader2, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import {
  CATEGORY_SERVICE_TYPES,
  SERVICE_TYPE_CONFIG_FIELDS,
  SERVICE_TYPE_HTTP_MODE,
  isBuiltInServiceType,
  type ConfigFieldDef,
  ServiceCategory,
} from "@/lib/service-types";
import type { ServiceType } from "@prisma/client";

const allCategories = Object.keys(CATEGORY_SERVICE_TYPES) as Array<
  keyof typeof CATEGORY_SERVICE_TYPES
>;

interface ServiceItem {
  id: string;
  name: string;
  type: string;
  endpointUrl: string | null;
  builtIn?: boolean;
}

type ConnectionStatus = "untested" | "connected" | "failed";

export default function ServicesPage() {
  const t = useTranslations("services");

  // --- Add form state ---
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<string>("");
  const [formType, setFormType] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formEndpointUrl, setFormEndpointUrl] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});

  // --- Data state ---
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allowedTypes, setAllowedTypes] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  // --- Edit state ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEndpointUrl, setEditEndpointUrl] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => {});

    fetch("/api/organizations")
      .then((r) => r.json())
      .then((org) => {
        if (org.allowedServices) {
          const enabled = new Set<string>(
            org.allowedServices
              .filter((s: { enabled: boolean }) => s.enabled)
              .map((s: { serviceType: string }) => s.serviceType)
          );
          setAllowedTypes(enabled);
        }
      })
      .catch(() => {});
  }, []);

  // --- Add form helpers ---
  function resetForm() {
    setFormCategory("");
    setFormType("");
    setFormName("");
    setFormEndpointUrl("");
    setFormConfig({});
  }

  function handleCategoryChange(cat: string) {
    setFormCategory(cat);
    setFormType("");
    setFormConfig({});
  }

  function handleTypeChange(newType: string) {
    setFormType(newType);
    setFormConfig({});
  }

  const availableTypesForCategory = formCategory
    ? (CATEGORY_SERVICE_TYPES[formCategory as ServiceCategory] || []).filter(
        (st) => allowedTypes.has(st) && !isBuiltInServiceType(st as ServiceType)
      )
    : [];

  // Categories that have at least one allowed type
  const availableCategories = allCategories.filter(
    (cat) =>
      CATEGORY_SERVICE_TYPES[cat].some((st) => allowedTypes.has(st))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        type: formType,
        endpointUrl: formEndpointUrl,
        ...formConfig,
      }),
    });

    if (res.ok) {
      const svc = await res.json();
      setServices((prev) => [svc, ...prev]);
      resetForm();
      setShowForm(false);
    }
  }

  // --- Delete ---
  async function handleDelete(id: string) {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      setConnectionStatus((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  // --- Test ---
  async function handleTest(id: string) {
    setTestingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/services/${id}/test`, { method: "POST" });
      const result = await res.json();
      setConnectionStatus((prev) => ({
        ...prev,
        [id]: result.success ? "connected" : "failed",
      }));
    } catch {
      setConnectionStatus((prev) => ({ ...prev, [id]: "failed" }));
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // --- Edit helpers ---
  function startEdit(svc: ServiceItem) {
    setEditingId(svc.id);
    setEditName(svc.name);
    setEditEndpointUrl(svc.endpointUrl || "");
    setEditConfig({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEndpointUrl("");
    setEditConfig({});
  }

  async function handleSaveEdit(svc: ServiceItem) {
    const body: Record<string, string> = {};
    if (editName && editName !== svc.name) body.name = editName;
    if (editEndpointUrl !== (svc.endpointUrl || ""))
      body.endpointUrl = editEndpointUrl;
    // Include config fields that have values
    for (const [k, v] of Object.entries(editConfig)) {
      if (v) body[k] = v;
    }

    if (Object.keys(body).length === 0) {
      cancelEdit();
      return;
    }

    const res = await fetch(`/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, ...updated } : s))
      );
      // Reset connection status since config changed
      setConnectionStatus((prev) => {
        const next = { ...prev };
        delete next[svc.id];
        return next;
      });
      cancelEdit();
    }
  }

  // --- Derived ---
  const configFields: ConfigFieldDef[] =
    formType
      ? SERVICE_TYPE_CONFIG_FIELDS[formType as ServiceType] || []
      : [];

  function getStatusBadge(id: string) {
    if (testingIds.has(id)) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("testing")}
        </Badge>
      );
    }
    const status = connectionStatus[id];
    if (status === "connected") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t("statusConnected")}
        </Badge>
      );
    }
    if (status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("statusFailed")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <CircleDashed className="h-3 w-3" />
        {t("statusUntested")}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      {/* --- Add form --- */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
            <CardDescription>{t("addDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("category")}</label>
                <select
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectCategory")}</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`categories.${cat}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Service type (only after category selected) */}
              {formCategory && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t("selectType")}</option>
                    {availableTypesForCategory.map((st) => (
                      <option key={st} value={st}>
                        {t(`types.${st}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 3: Name and config (only after type selected) */}
              {formType && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("name")}</label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="My Service"
                      required
                    />
                  </div>

                  {/* Endpoint URL - only for user-provided httpMode */}
                  {SERVICE_TYPE_HTTP_MODE[formType as ServiceType] ===
                    "user-provided" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("endpointUrl")}
                      </label>
                      <Input
                        value={formEndpointUrl}
                        onChange={(e) => setFormEndpointUrl(e.target.value)}
                        placeholder="https://..."
                        required
                      />
                    </div>
                  )}
                  {SERVICE_TYPE_HTTP_MODE[formType as ServiceType] ===
                    "proxy" && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {t("proxyHint")}
                    </p>
                  )}
                  {SERVICE_TYPE_HTTP_MODE[formType as ServiceType] ===
                    "fixed" && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {t("fixedHint")}
                    </p>
                  )}
                  {SERVICE_TYPE_HTTP_MODE[formType as ServiceType] ===
                    "sdk" && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {t("sdkHint")}
                    </p>
                  )}

                  {/* Dynamic config fields */}
                  {configFields.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {configFields.map((field) => (
                        <div
                          key={field.key}
                          className={`space-y-2 ${
                            configFields.length === 1 ? "md:col-span-2" : ""
                          }`}
                        >
                          <label className="text-sm font-medium">
                            {t(field.key)}
                          </label>
                          <Input
                            type={field.type}
                            value={formConfig[field.key] || ""}
                            onChange={(e) =>
                              setFormConfig((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={!formType || !formName}>
                  {t("add")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  {t("cancelEdit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* --- Service list --- */}
      {services.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">{t("emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => {
            const isEditing = editingId === svc.id;
            const editFields: ConfigFieldDef[] =
              SERVICE_TYPE_CONFIG_FIELDS[svc.type as ServiceType] || [];

            return (
              <Card key={svc.id}>
                <CardContent className="p-4">
                  {isEditing ? (
                    /* --- Edit mode --- */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-muted-foreground">
                          {t("editService")}
                        </p>
                        <Badge variant="secondary">{t(`types.${svc.type}`)}</Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("name")}
                          </label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </div>

                        {SERVICE_TYPE_HTTP_MODE[svc.type as ServiceType] ===
                          "user-provided" && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {t("endpointUrl")}
                            </label>
                            <Input
                              value={editEndpointUrl}
                              onChange={(e) =>
                                setEditEndpointUrl(e.target.value)
                              }
                              placeholder="https://..."
                            />
                          </div>
                        )}
                      </div>

                      {editFields.length > 0 && (
                        <div className="grid gap-4 md:grid-cols-2">
                          {editFields.map((field) => (
                            <div
                              key={field.key}
                              className={`space-y-2 ${
                                editFields.length === 1 ? "md:col-span-2" : ""
                              }`}
                            >
                              <label className="text-sm font-medium">
                                {t(field.key)}
                              </label>
                              <Input
                                type={field.type}
                                value={editConfig[field.key] || ""}
                                onChange={(e) =>
                                  setEditConfig((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                placeholder={field.placeholder}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(svc)}
                        >
                          {t("saveChanges")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          {t("cancelEdit")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* --- Display mode --- */
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{svc.name}</p>
                            {getStatusBadge(svc.id)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary">{t(`types.${svc.type}`)}</Badge>
                            {svc.builtIn && (
                              <Badge variant="default" className="text-xs">{t("builtIn")}</Badge>
                            )}
                            {SERVICE_TYPE_HTTP_MODE[svc.type as ServiceType] ===
                            "proxy" ? (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                Proxy: /api/proxy/{svc.id}/query
                              </span>
                            ) : svc.endpointUrl ? (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {svc.endpointUrl}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(svc.id)}
                          disabled={testingIds.has(svc.id)}
                        >
                          {testingIds.has(svc.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            {t("testConnection")}
                          </span>
                        </Button>
                        {!svc.builtIn && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(svc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {!svc.builtIn && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(svc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
