"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calls": "Call Explorer",
  "/trends": "Trends",
  "/recaps": "Recaps",
  "/audits": "Call Quality Audits",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const baseRoute = "/" + (pathname.split("/")[1] ?? "");
  const title = pageTitles[baseRoute] ?? "Pfitzer Pulse";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          MS
        </div>
      </div>
    </header>
  );
}
