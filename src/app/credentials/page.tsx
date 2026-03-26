"use client";

import { useState } from "react";
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
import { Database, Plus, Trash2, TestTube } from "lucide-react";

interface CredentialForm {
  name: string;
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  apiKey: string;
  projectUrl: string;
}

const emptyForm: CredentialForm = {
  name: "",
  type: "postgres",
  host: "",
  port: "",
  database: "",
  username: "",
  password: "",
  apiKey: "",
  projectUrl: "",
};

const credentialTypes = ["postgres", "supabase", "mysql", "redis"] as const;

export default function CredentialsPage() {
  const t = useTranslations("credentials");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CredentialForm>(emptyForm);
  const [credentials, setCredentials] = useState<
    { id: string; name: string; type: string }[]
  >([]);

  function updateForm(key: keyof CredentialForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const ds = await res.json();
      setCredentials((prev) => [...prev, ds]);
      setForm(emptyForm);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCredentials((prev) => prev.filter((ds) => ds.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
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
              Configure a new credential connection
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
                    placeholder="My Database"
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
                    {credentialTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(form.type === "postgres" || form.type === "mysql") && (
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
                      placeholder={form.type === "postgres" ? "5432" : "3306"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("database")}
                    </label>
                    <Input
                      value={form.database}
                      onChange={(e) => updateForm("database", e.target.value)}
                      placeholder="mydb"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("username")}
                    </label>
                    <Input
                      value={form.username}
                      onChange={(e) => updateForm("username", e.target.value)}
                      placeholder="user"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      {t("password")}
                    </label>
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
                    <label className="text-sm font-medium">
                      {t("projectUrl")}
                    </label>
                    <Input
                      value={form.projectUrl}
                      onChange={(e) => updateForm("projectUrl", e.target.value)}
                      placeholder="https://xxx.supabase.co"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("apiKey")}
                    </label>
                    <Input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => updateForm("apiKey", e.target.value)}
                      placeholder="your-anon-key"
                    />
                  </div>
                </div>
              )}

              {form.type === "redis" && (
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
                      placeholder="6379"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      {t("password")}
                    </label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      placeholder="********"
                    />
                  </div>
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

      {credentials.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              No credentials configured
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {credentials.map((ds) => (
            <Card key={ds.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{ds.name}</p>
                    <Badge variant="secondary">{ds.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <TestTube className="h-4 w-4" />
                    {t("testConnection")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ds.id)}
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
