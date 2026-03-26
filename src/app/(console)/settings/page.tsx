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
import { User, Lock, Globe } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  organization: { name: string };
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [currentLocale, setCurrentLocale] = useState("zh-TW");

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name);
      })
      .catch(() => {});

    const locale =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("locale="))
        ?.split("=")[1] || "zh-TW";
    setCurrentLocale(locale);
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setProfileMsg("");

    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setProfileMsg(t("profileUpdated"));
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError(false);

    if (newPassword !== confirmPassword) {
      setPasswordMsg(t("passwordMismatch"));
      setPasswordError(true);
      return;
    }

    setPasswordSaving(true);

    const res = await fetch("/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
      setPasswordMsg(t("passwordChanged"));
      setPasswordError(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordMsg(t("passwordError"));
      setPasswordError(true);
    }
    setPasswordSaving(false);
  }

  function switchLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    setCurrentLocale(locale);
    window.location.reload();
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("profile")}
          </CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("name")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("email")}</label>
              <Input value={profile.email} disabled />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("role")}</label>
                <div>
                  <Badge
                    variant={
                      profile.role === "admin" ? "default" : "secondary"
                    }
                  >
                    {profile.role}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {t("organization")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {profile.organization.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving || !name.trim()}>
                {t("updateProfile")}
              </Button>
              {profileMsg && (
                <span className="text-sm text-green-600">{profileMsg}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("changePassword")}
          </CardTitle>
          <CardDescription>{t("changePasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("currentPassword")}
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("newPassword")}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("confirmPassword")}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  passwordSaving ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {t("changePassword")}
              </Button>
              {passwordMsg && (
                <span
                  className={`text-sm ${passwordError ? "text-destructive" : "text-green-600"}`}
                >
                  {passwordMsg}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("language")}
          </CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={currentLocale === "en" ? "default" : "outline"}
              onClick={() => switchLocale("en")}
            >
              {t("languageEn")}
            </Button>
            <Button
              variant={currentLocale === "zh-TW" ? "default" : "outline"}
              onClick={() => switchLocale("zh-TW")}
            >
              {t("languageZhTW")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
