"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  UsersIcon,
  CalendarCheckIcon,
  LibraryIcon,
  LayoutTemplateIcon,
  HeartPulseIcon,
  CreditCardIcon,
  SettingsIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboardIcon },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: UsersIcon },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: CalendarCheckIcon },
  { href: "/dashboard/ejercicios", label: "Ejercicios", icon: LibraryIcon },
  { href: "/dashboard/rutinas/plantillas", label: "Plantillas", icon: LayoutTemplateIcon },
  { href: "/dashboard/retencion", label: "Retención", icon: HeartPulseIcon },
  { href: "/dashboard/pagos", label: "Pagos", icon: CreditCardIcon },
];

const configSubItems = [
  { href: "/dashboard/configuracion/retencion", label: "Retención" },
  { href: "/dashboard/configuracion/mensajes", label: "Mensajes" },
];

function isPathActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ retentionAlertCount = 0 }: { retentionAlertCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = isPathActive(pathname, item.href);
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
            {item.href === "/dashboard/retencion" && retentionAlertCount > 0 && (
              <span
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                  isActive ? "bg-primary-foreground text-primary" : "bg-red-500 text-white"
                )}
              >
                {retentionAlertCount > 99 ? "99+" : retentionAlertCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* "Configuración" ya no es un destino único (antes apuntaba directo a
          /configuracion/retencion) — con Mensajes sumado pasa a ser solo un
          encabezado de sección, sin link propio, con los 2 sub-items debajo. */}
      <div className="mt-1 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium text-muted-foreground">
          <SettingsIcon className="size-4" />
          Configuración
        </div>
        <div className="flex flex-col gap-1 pl-7">
          {configSubItems.map((item) => {
            const isActive = isPathActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
