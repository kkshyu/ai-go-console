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
import { Building2, Globe, Plus, Trash2, Check, Link } from "lucide-react";

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

export default function OrganizationSettingsPage() {
  const t = useTranslations("organization");
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [domains, setDomains] = useState<OrgDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState("");

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
      })
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
      setSlugError(data.error || "Failed to update slug");
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

  if (!org) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
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
                <div>
                  <p className="font-mono text-sm font-medium">{domain.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    {domain.isActive ? t("domainActive") : t("domainPending")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDomain(domain.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {domains.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noDomainsYet")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
