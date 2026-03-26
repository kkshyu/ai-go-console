"use client";

import { useTranslations } from "next-intl";
import { Globe, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const t = useTranslations("nav");

  async function switchLocale() {
    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1];
    const next = current === "en" ? "zh-TW" : "en";
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={switchLocale} title="Switch Language">
          <Globe className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" title={t("logout")}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
