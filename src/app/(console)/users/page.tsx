"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Shield,
  User as UserIcon,
  Plus,
  Trash2,
  Loader2,
  ServerCog,
  X,
  Check,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  allowedServices: { service: { id: string; name: string; type: string } }[];
}

interface ServiceItem {
  id: string;
  name: string;
  type: string;
}

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"user" | "admin">("user");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Service authorization
  const [servicesPanelUserId, setServicesPanelUserId] = useState<string | null>(null);
  const [orgServices, setOrgServices] = useState<ServiceItem[]>([]);
  const [userAllowedIds, setUserAllowedIds] = useState<Set<string>>(new Set());
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openServicesPanel = useCallback(async (userId: string) => {
    setServicesPanelUserId(userId);
    setServicesLoading(true);

    try {
      const [orgRes, userRes] = await Promise.all([
        fetch("/api/services"),
        fetch(`/api/users/${userId}/allowed-services`),
      ]);
      const orgData = await orgRes.json();
      const userData = await userRes.json();

      setOrgServices(
        (orgData as ServiceItem[]).map((s) => ({ id: s.id, name: s.name, type: s.type }))
      );
      setUserAllowedIds(new Set((userData as ServiceItem[]).map((s) => s.id)));
    } catch {
      setOrgServices([]);
      setUserAllowedIds(new Set());
    } finally {
      setServicesLoading(false);
    }
  }, []);

  function toggleServiceId(serviceId: string) {
    setUserAllowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }

  async function saveAllowedServices() {
    if (!servicesPanelUserId) return;
    setServicesSaving(true);
    try {
      const res = await fetch(`/api/users/${servicesPanelUserId}/allowed-services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: Array.from(userAllowedIds) }),
      });
      if (res.ok) {
        const updatedServices = (await res.json()) as ServiceItem[];
        const userId = servicesPanelUserId;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  allowedServices: updatedServices.map((s) => ({
                    service: { id: s.id, name: s.name, type: s.type },
                  })),
                }
              : u
          )
        );
      }
      setServicesPanelUserId(null);
    } catch {
      // ignore
    } finally {
      setServicesSaving(false);
    }
  }

  async function toggleRole(user: UserItem) {
    const newRole = user.role === "admin" ? "user" : "admin";
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formEmail,
        password: formPassword,
        name: formName,
        role: formRole,
      }),
    });

    if (res.ok) {
      const newUser = await res.json();
      setUsers((prev) => [newUser, ...prev]);
      setShowForm(false);
      setFormEmail("");
      setFormName("");
      setFormPassword("");
      setFormRole("user");
    } else {
      const data = await res.json();
      setFormError(data.error || t("addError"));
    }
    setSubmitting(false);
  }

  async function handleDelete(userId: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(userId);

    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      alert(data.error || t("deleteError"));
    }
    setDeletingId(null);
  }

  const servicesPanelUser = users.find((u) => u.id === servicesPanelUserId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addUser")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("email")}</label>
                  <Input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("name")}</label>
                  <Input
                    placeholder={t("namePlaceholder")}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("password")}</label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("role")}</label>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={formRole === "user" ? "default" : "outline"}
                      onClick={() => setFormRole("user")}
                    >
                      {t("user")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={formRole === "admin" ? "default" : "outline"}
                      onClick={() => setFormRole("admin")}
                    >
                      {t("admin")}
                    </Button>
                  </div>
                </div>
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormError("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{tc("loading")}</div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">{t("noUsers")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    {user.role === "admin" ? (
                      <Shield className="h-5 w-5" />
                    ) : (
                      <UserIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {user.allowedServices.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.allowedServices.map(({ service }) => (
                          <Badge key={service.id} variant="outline" className="text-xs font-normal">
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? t("admin") : t("user")}
                  </Badge>
                  <span className="hidden sm:inline text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openServicesPanel(user.id)}
                  >
                    <ServerCog className="h-4 w-4 mr-1" />
                    {t("manageServices")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleRole(user)}>
                    {user.role === "admin" ? t("setUser") : t("setAdmin")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                    disabled={deletingId === user.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Service Authorization Panel (Modal) */}
      {servicesPanelUserId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="relative w-full max-w-lg bg-background rounded-lg border shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-sm font-semibold">{t("allowedServices")}</h2>
                {servicesPanelUser && (
                  <p className="text-xs text-muted-foreground">{servicesPanelUser.name} ({servicesPanelUser.email})</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setServicesPanelUserId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : orgServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("noServicesAuthorized")}
                </p>
              ) : (
                <div className="space-y-2">
                  {orgServices.map((svc) => {
                    const isAllowed = userAllowedIds.has(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                          isAllowed
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => toggleServiceId(svc.id)}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isAllowed
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isAllowed && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.type}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setServicesPanelUserId(null)}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={saveAllowedServices}
                disabled={servicesSaving || servicesLoading}
              >
                {servicesSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {t("saveServices")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
