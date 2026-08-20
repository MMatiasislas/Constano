"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  UsersIcon,
  DumbbellIcon,
  HeartPulseIcon,
  CreditCardIcon,
  SettingsIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboardIcon },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: UsersIcon },
  { href: "/dashboard/rutinas", label: "Rutinas", icon: DumbbellIcon },
  { href: "/dashboard/retencion", label: "Retención", icon: HeartPulseIcon },
  { href: "/dashboard/pagos", label: "Pagos", icon: CreditCardIcon },
  { href: "/dashboard/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
