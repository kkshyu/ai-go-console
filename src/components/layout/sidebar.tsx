"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Activity,
  AppWindow,
  PlusCircle,
  Server,
  Users,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/create", labelKey: "createApp", icon: PlusCircle },
  { href: "/apps", labelKey: "apps", icon: AppWindow },
  { href: "/services", labelKey: "services", icon: Server, adminOnly: true },
  { href: "/agents", labelKey: "agents", icon: Activity, adminOnly: true },
  { href: "/users", labelKey: "users", icon: Users, adminOnly: true },
  { href: "/settings/organization", labelKey: "organization", icon: Building2, adminOnly: true },
];

export function Sidebar({ userRole = "admin" }: { userRole?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          AI
        </div>
        <span className="text-lg font-bold text-sidebar-foreground">
          AI Go
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          {t("settings")}
        </Link>
      </div>
    </aside>
  );
}
