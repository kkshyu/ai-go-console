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
import { Server, Plus, Trash2, TestTube } from "lucide-react";
import {
  CATEGORY_SERVICE_TYPES,
  SERVICE_TYPE_CONFIG_FIELDS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_TYPE_CATEGORY,
  type ConfigFieldDef,
} from "@/lib/service-types";
import type { ServiceType } from "@prisma/client";

const allCategories = Object.keys(CATEGORY_SERVICE_TYPES) as Array<
  keyof typeof CATEGORY_SERVICE_TYPES
>;

export default function ServicesPage() {
  const t = useTranslations("services");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<string>("postgresql");
  const [formName, setFormName] = useState("");
  const [formEndpointUrl, setFormEndpointUrl] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [services, setServices] = useState<
    { id: string; name: string; type: string; endpointUrl: string | null }[]
  >([]);
  const [allowedTypes, setAllowedTypes] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

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

  function resetForm() {
    setFormName("");
    setFormType("postgresql");
    setFormEndpointUrl("");
    setFormConfig({});
  }

  function handleTypeChange(newType: string) {
    setFormType(newType);
    setFormConfig({});
  }

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

  async function handleDelete(id: string) {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleTest(id: string) {
    const res = await fetch(`/api/services/${id}/test`, { method: "POST" });
    const result = await res.json();
    setTestResults((prev) => ({ ...prev, [id]: result }));
  }

  const configFields: ConfigFieldDef[] =
    SERVICE_TYPE_CONFIG_FIELDS[formType as ServiceType] || [];

  const category = SERVICE_TYPE_CATEGORY[formType as ServiceType];

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

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
            <CardDescription>{t("addDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("name")}</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Service"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {allCategories.map((cat) => {
                      const types = CATEGORY_SERVICE_TYPES[cat].filter((st) =>
                        allowedTypes.has(st)
                      );
                      if (types.length === 0) return null;
                      return (
                        <optgroup
                          key={cat}
                          label={t(`categories.${cat}`)}
                        >
                          {types.map((st) => (
                            <option key={st} value={st}>
                              {t(`types.${st}`)}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Endpoint URL - common to all types */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("endpointUrl")}
                </label>
                <Input
                  value={formEndpointUrl}
                  onChange={(e) => setFormEndpointUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Dynamic config fields based on service type */}
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

              {category && (
                <p className="text-xs text-muted-foreground">
                  {t(`categories.${category}`)}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit">{t("add")}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {services.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">{t("emptyState")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <Card key={svc.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">{svc.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{svc.type}</Badge>
                      {svc.endpointUrl && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {svc.endpointUrl}
                        </span>
                      )}
                    </div>
                    {testResults[svc.id] && (
                      <p
                        className={`text-xs mt-1 ${
                          testResults[svc.id].success
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {testResults[svc.id].message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(svc.id)}
                  >
                    <TestTube className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("testConnection")}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(svc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
