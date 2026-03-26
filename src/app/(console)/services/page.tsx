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

interface ServiceForm {
  name: string;
  type: string;
  endpointUrl: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  apiKey: string;
  projectUrl: string;
  adminSecret: string;
  webhookSecret: string;
}

const emptyForm: ServiceForm = {
  name: "",
  type: "postgresql",
  endpointUrl: "",
  host: "",
  port: "",
  database: "",
  username: "",
  password: "",
  apiKey: "",
  projectUrl: "",
  adminSecret: "",
  webhookSecret: "",
};

const serviceTypes = ["disk", "postgresql", "supabase", "stripe", "hasura"] as const;

export default function ServicesPage() {
  const t = useTranslations("services");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [services, setServices] = useState<
    { id: string; name: string; type: string; endpointUrl: string | null }[]
  >([]);
  const [allowedTypes, setAllowedTypes] = useState<Set<string>>(new Set(serviceTypes));
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

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

  function updateForm(key: keyof ServiceForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const svc = await res.json();
      setServices((prev) => [svc, ...prev]);
      setForm(emptyForm);
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

  const filteredTypes = serviceTypes.filter((t) => allowedTypes.has(t));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("add")}</CardTitle>
            <CardDescription>
              {t("addDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("name")}</label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="My Service"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <select
                    value={form.type}
                    onChange={(e) => updateForm("type", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {filteredTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Endpoint URL - common to all types */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("endpointUrl")}</label>
                <Input
                  value={form.endpointUrl}
                  onChange={(e) => updateForm("endpointUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {form.type === "postgresql" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("host")}</label>
                    <Input
                      value={form.host}
                      onChange={(e) => updateForm("host", e.target.value)}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("port")}</label>
                    <Input
                      value={form.port}
                      onChange={(e) => updateForm("port", e.target.value)}
                      placeholder="5432"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("database")}</label>
                    <Input
                      value={form.database}
                      onChange={(e) => updateForm("database", e.target.value)}
                      placeholder="mydb"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("username")}</label>
                    <Input
                      value={form.username}
                      onChange={(e) => updateForm("username", e.target.value)}
                      placeholder="user"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">{t("password")}</label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      placeholder="********"
                    />
                  </div>
                </div>
              )}

              {form.type === "supabase" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("projectUrl")}</label>
                    <Input
                      value={form.projectUrl}
                      onChange={(e) => updateForm("projectUrl", e.target.value)}
                      placeholder="https://xxx.supabase.co"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("apiKey")}</label>
                    <Input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => updateForm("apiKey", e.target.value)}
                      placeholder="your-anon-key"
                    />
                  </div>
                </div>
              )}

              {form.type === "disk" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("apiKey")}</label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => updateForm("apiKey", e.target.value)}
                    placeholder="your-api-key"
                  />
                </div>
              )}

              {form.type === "stripe" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("apiKey")}</label>
                    <Input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => updateForm("apiKey", e.target.value)}
                      placeholder="sk_..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("webhookSecret")}</label>
                    <Input
                      type="password"
                      value={form.webhookSecret}
                      onChange={(e) => updateForm("webhookSecret", e.target.value)}
                      placeholder="whsec_..."
                    />
                  </div>
                </div>
              )}

              {form.type === "hasura" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("adminSecret")}</label>
                  <Input
                    type="password"
                    value={form.adminSecret}
                    onChange={(e) => updateForm("adminSecret", e.target.value)}
                    placeholder="your-admin-secret"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit">{t("add")}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
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
            <p className="text-lg text-muted-foreground">
              {t("emptyState")}
            </p>
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
                      <p className={`text-xs mt-1 ${testResults[svc.id].success ? "text-green-600" : "text-red-600"}`}>
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
                    <span className="hidden sm:inline">{t("testConnection")}</span>
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
