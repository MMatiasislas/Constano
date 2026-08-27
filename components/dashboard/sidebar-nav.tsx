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
  BarChart3Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboardIcon, ownerOnly: false },
  { href: "/dashboard/negocio", label: "Negocio", icon: BarChart3Icon, ownerOnly: true },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: UsersIcon, ownerOnly: false },
  { href: "/dashboard/asistencia", label: "Asistencia", icon: CalendarCheckIcon, ownerOnly: false },
  { href: "/dashboard/ejercicios", label: "Ejercicios", icon: LibraryIcon, ownerOnly: false },
  {
    href: "/dashboard/rutinas/plantillas",
    label: "Plantillas",
    icon: LayoutTemplateIcon,
    ownerOnly: false,
  },
  { href: "/dashboard/retencion", label: "Retención", icon: HeartPulseIcon, ownerOnly: false },
  { href: "/dashboard/pagos", label: "Pagos", icon: CreditCardIcon, ownerOnly: false },
];

const configSubItems = [
  { href: "/dashboard/configuracion/general", label: "General", ownerOnly: false },
  { href: "/dashboard/configuracion/retencion", label: "Retención", ownerOnly: false },
  { href: "/dashboard/configuracion/mensajes", label: "Mensajes", ownerOnly: false },
  { href: "/dashboard/configuracion/planes", label: "Planes", ownerOnly: false },
  { href: "/dashboard/configuracion/kiosco", label: "Kiosco", ownerOnly: false },
  { href: "/dashboard/configuracion/suscripcion", label: "Suscripción", ownerOnly: false },
  { href: "/dashboard/configuracion/equipo", label: "Equipo", ownerOnly: true },
];

function isPathActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  retentionAlertCount = 0,
  pagosVencidosCount = 0,
  isOwner = false,
}: {
  retentionAlertCount?: number;
  pagosVencidosCount?: number;
  isOwner?: boolean;
}) {
  const pathname = usePathname();

  const badgeCountByHref: Record<string, number> = {
    "/dashboard/retencion": retentionAlertCount,
    "/dashboard/pagos": pagosVencidosCount,
  };

  const visibleNavItems = navItems.filter((item) => !item.ownerOnly || isOwner);
  const visibleConfigSubItems = configSubItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visibleNavItems.map((item) => {
        const isActive = isPathActive(pathname, item.href);
        const Icon = item.icon;
        const badgeCount = badgeCountByHref[item.href] ?? 0;

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
            {badgeCount > 0 && (
              <span
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                  isActive ? "bg-primary-foreground text-primary" : "bg-red-500 text-white"
                )}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
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
          {visibleConfigSubItems.map((item) => {
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
