"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AppWindow,
  PlusCircle,
  Server,
  Users,
  Settings,
  Building2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

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
  { href: "/users", labelKey: "users", icon: Users, adminOnly: true },
  { href: "/settings/organization", labelKey: "organization", icon: Building2, adminOnly: true },
];

export function MobileSidebar({ userRole = "admin" }: { userRole?: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              AI
            </div>
            <span className="text-lg font-bold">AI Go</span>
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
                  onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
              {t("settings")}
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
