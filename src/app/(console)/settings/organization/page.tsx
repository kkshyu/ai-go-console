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
import { Building2, Users, Shield, ShieldOff, Globe, Plus, Trash2 } from "lucide-react";

interface AllowedService {
  id: string;
  serviceType: string;
  enabled: boolean;
}

interface OrgDomain {
  id: string;
  domain: string;
  isActive: boolean;
  sslStatus: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  allowedServices: AllowedService[];
  _count: { users: number; services: number };
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  disk: "Disk Storage",
  postgresql: "PostgreSQL",
  supabase: "Supabase",
  stripe: "Stripe",
  hasura: "Hasura",
};

export default function OrganizationSettingsPage() {
  const t = useTranslations("organization");
  const [org, setOrg] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [domains, setDomains] = useState<OrgDomain[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!data || !data.id) return;
        setOrg(data);
        fetch(`/api/organizations/${data.id}/members`)
          .then((r) => r.json())
          .then(setMembers)
          .catch(() => {});
        fetch(`/api/organizations/${data.id}/domains`)
          .then((r) => r.json())
          .then(setDomains)
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  async function toggleService(serviceType: string, enabled: boolean) {
    if (!org) return;
    setSaving(true);

    await fetch(`/api/organizations/${org.id}/allowed-services`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        services: [{ serviceType, enabled }],
      }),
    });

    setOrg((prev) =>
      prev
        ? {
            ...prev,
            allowedServices: prev.allowedServices.map((s) =>
              s.serviceType === serviceType ? { ...s, enabled } : s
            ),
          }
        : null
    );
    setSaving(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !inviteEmail.trim()) return;

    const res = await fetch(`/api/organizations/${org.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });

    if (res.ok) {
      const member = await res.json();
      setMembers((prev) => [...prev, { ...member, createdAt: new Date().toISOString() }]);
      setInviteEmail("");
    }
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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* Org Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {org.name}
          </CardTitle>
          <CardDescription>
            {org._count?.users ?? 0} {t("members")} &middot; {org._count?.services ?? 0} {t("servicesCount")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Allowed Services */}
      <Card>
        <CardHeader>
          <CardTitle>{t("allowedServices")}</CardTitle>
          <CardDescription>{t("allowedServicesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {org.allowedServices.map((svc) => (
            <div
              key={svc.serviceType}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {svc.enabled ? (
                  <Shield className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {SERVICE_TYPE_LABELS[svc.serviceType] || svc.serviceType}
                  </p>
                  <p className="text-xs text-muted-foreground">{svc.serviceType}</p>
                </div>
              </div>
              <Button
                variant={svc.enabled ? "outline" : "default"}
                size="sm"
                disabled={saving}
                onClick={() => toggleService(svc.serviceType, !svc.enabled)}
              >
                {svc.enabled ? t("disable") : t("enable")}
              </Button>
            </div>
          ))}
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

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("members")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("invitePlaceholder")}
              type="email"
              className="flex-1"
            />
            <Button type="submit" disabled={!inviteEmail.trim()}>
              {t("invite")}
            </Button>
          </form>

          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
