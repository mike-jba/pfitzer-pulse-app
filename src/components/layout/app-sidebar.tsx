"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Phone,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Call Explorer", icon: Phone },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/recaps", label: "Recaps", icon: FileText },
  { href: "/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Image
          src="/Pfitzer_blue_logo.png"
          alt="Pfitzer Pest Control"
          width={160}
          height={44}
          className="h-11 w-auto max-w-[168px] object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-[11px] text-sidebar-foreground/40">
          Pfitzer Pest Control
        </p>
      </div>
    </aside>
  );
}
