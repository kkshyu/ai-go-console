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
import { Building2, Globe, Plus, Trash2, Check, Link, Copy, Wifi, WifiOff, Bot } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/models";

const AGENT_ROLES = [
  { role: "pm", label: "PM" },
  { role: "architect", label: "Architect" },
  { role: "developer", label: "Developer" },
  { role: "reviewer", label: "Reviewer" },
  { role: "devops", label: "DevOps" },
  { role: "ux_designer", label: "UX Designer" },
  { role: "tester", label: "Tester" },
  { role: "db_migrator", label: "DB Migrator" },
  { role: "doc_writer", label: "Doc Writer" },
] as const;

const TIERS = [
  { tier: "senior", label: "Senior" },
  { tier: "intermediate", label: "Intermediate" },
  { tier: "junior", label: "Junior" },
] as const;

interface OrgDomain {
  id: string;
  domain: string;
  isActive: boolean;
  sslStatus: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
}

interface ProxyStatus {
  available: boolean;
  mode: string;
  localDomain: string;
  localUrl: string;
  devDomain: string;
  devUrl: string;
}

export default function OrganizationSettingsPage() {
  const t = useTranslations("organization");
  const tc = useTranslations("common");
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [domains, setDomains] = useState<OrgDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});
  const [defaultModels, setDefaultModels] = useState<Record<string, string>>({});
  const [savingModels, setSavingModels] = useState(false);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!data || !data.id) return;
        setOrg(data);
        setOrgName(data.name);
        setOrgSlug(data.slug);
        fetch(`/api/organizations/${data.id}/domains`)
          .then((r) => r.json())
          .then(setDomains)
          .catch(() => {});
        fetch(`/api/organizations/${data.id}/agent-models`)
          .then((r) => r.json())
          .then((result: { configs: { agentRole: string; modelId: string }[]; defaults: Record<string, string> }) => {
            const map: Record<string, string> = {};
            result.configs.forEach((c) => { map[c.agentRole] = c.modelId; });
            setAgentModels(map);
            setDefaultModels(result.defaults || {});
          })
          .catch(() => {});
      })
      .catch(() => {});

    fetch("/api/proxy/status")
      .then((r) => r.json())
      .then(setProxyStatus)
      .catch(() => {});
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !orgName.trim() || orgName === org.name) return;
    setSavingName(true);

    const res = await fetch(`/api/organizations/${org.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim() }),
    });

    if (res.ok) {
      setOrg((prev) => (prev ? { ...prev, name: orgName.trim() } : null));
    }
    setSavingName(false);
  }

  async function handleSaveSlug(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !orgSlug.trim() || orgSlug === org.slug) return;
    setSavingSlug(true);
    setSlugError("");

    const res = await fetch(`/api/organizations/${org.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: org.name, slug: orgSlug.trim() }),
    });

    if (res.ok) {
      const updated = await res.json();
      setOrg(updated);
      setOrgSlug(updated.slug);
    } else {
      const data = await res.json();
      setSlugError(data.error || t("slugUpdateFailed"));
    }
    setSavingSlug(false);
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !newDomain.trim()) return;

    const res = await fetch(`/api/organizations/${org.id}/domains`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain.trim() }),
    });

    if (res.ok) {
      const domain = await res.json();
      setDomains((prev) => [domain, ...prev]);
      setNewDomain("");
    }
  }

  async function handleRemoveDomain(domainId: string) {
    if (!org) return;

    const res = await fetch(`/api/organizations/${org.id}/domains`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });

    if (res.ok) {
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
    }
  }

  async function handleSaveAgentModels() {
    if (!org) return;
    setSavingModels(true);

    // Build configs for all role:tier combinations
    const configs: { agentRole: string; modelId: string }[] = [];
    for (const { role } of AGENT_ROLES) {
      for (const { tier } of TIERS) {
        const key = `${role}:${tier}`;
        const value = agentModels[key];
        if (value) {
          configs.push({ agentRole: key, modelId: value });
        }
      }
    }

    const res = await fetch(`/api/organizations/${org.id}/agent-models`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configs }),
    });

    if (!res.ok) {
      alert(t("agentModelsSaveFailed"));
    }
    setSavingModels(false);
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* Org Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("orgName")}
          </CardTitle>
          <CardDescription>{t("orgNameDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={savingName || !orgName.trim() || orgName === org.name}
            >
              <Check className="h-4 w-4" />
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Org Slug */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("orgSlug")}
          </CardTitle>
          <CardDescription>{t("orgSlugDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSlug} className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={orgSlug}
                onChange={(e) => {
                  setOrgSlug(e.target.value);
                  setSlugError("");
                }}
                className="flex-1 font-mono"
                placeholder="my-organization"
              />
              <Button
                type="submit"
                disabled={savingSlug || !orgSlug.trim() || orgSlug === org.slug}
              >
                <Check className="h-4 w-4" />
                {t("save")}
              </Button>
            </div>
            {slugError && (
              <p className="text-sm text-destructive">{slugError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Local Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {proxyStatus?.available ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            {t("localAccess")}
            {proxyStatus?.available && (
              <span className="ml-auto text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {t("proxyConnected")}
              </span>
            )}
          </CardTitle>
          <CardDescription>{t("localAccessDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {proxyStatus?.available ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("productionEnv")}</p>
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                  <code className="flex-1 text-sm font-mono">
                    {proxyStatus.localUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(proxyStatus.localUrl)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {copiedUrl === proxyStatus.localUrl ? t("copied") : t("copyUrl")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("appAccessPattern", { url: proxyStatus.localUrl, appSlug: "app-slug" })}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("developmentEnv")}</p>
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                  <code className="flex-1 text-sm font-mono">
                    {proxyStatus.devUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(proxyStatus.devUrl)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {copiedUrl === proxyStatus.devUrl ? t("copied") : t("copyUrl")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("appAccessPattern", { url: proxyStatus.devUrl, appSlug: "app-slug" })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("proxyNotDetected")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Domains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("customDomains")}
          </CardTitle>
          <CardDescription>{t("customDomainsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder={t("domainPlaceholder")}
              className="flex-1"
            />
            <Button type="submit" disabled={!newDomain.trim()}>
              <Plus className="h-4 w-4" />
              {t("addDomain")}
            </Button>
          </form>

          <div className="space-y-2">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium">{domain.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    {domain.isActive ? t("domainActive") : t("domainPending")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyUrl(`https://${domain.domain}`)}
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDomain(domain.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {domains.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noDomainsYet")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t("agentModels")}
          </CardTitle>
          <CardDescription>{t("agentModelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header row */}
          <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-2 text-xs font-medium text-muted-foreground">
            <div />
            {TIERS.map(({ tier, label }) => (
              <div key={tier} className="text-center">{label}</div>
            ))}
          </div>
          {/* Agent rows */}
          <div className="grid gap-2">
            {AGENT_ROLES.map(({ role, label }) => (
              <div key={role} className="grid grid-cols-[120px_1fr_1fr_1fr] gap-2 items-center">
                <label className="text-sm font-medium truncate">{label}</label>
                {TIERS.map(({ tier }) => {
                  const key = `${role}:${tier}`;
                  const defaultModel = defaultModels[key] || "";
                  return (
                    <select
                      key={tier}
                      value={agentModels[key] || defaultModel}
                      onChange={(e) =>
                        setAgentModels((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {AVAILABLE_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  );
                })}
              </div>
            ))}
          </div>
          <Button onClick={handleSaveAgentModels} disabled={savingModels}>
            {savingModels ? tc("loading") : t("save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
