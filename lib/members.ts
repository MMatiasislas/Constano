import type { MemberStatus } from "@/types/db";

export const ESTADO_BADGE: Record<MemberStatus, { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  paused: {
    label: "Pausado",
    className: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  inactive: {
    label: "Inactivo",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

export function frecuenciaLabel(frequency: number | null) {
  return frequency ? `${frequency}x/sem` : "Libre";
}

export function getInitials(firstName: string, lastName: string | null) {
  const first = firstName.trim()[0] ?? "";
  const last = lastName?.trim()[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function nombreCompleto(firstName: string, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function whatsappHref(phone: string, mensaje?: string) {
  const numero = phone.replace(/[^\d]/g, "");
  return mensaje
    ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/${numero}`;
}

// Los campos `date` de Postgres llegan como "YYYY-MM-DD". Parsearlos con
// `new Date(str)` los interpreta como medianoche UTC y, al formatear en una
// zona horaria negativa (ej. Argentina), el día se corre uno para atrás.
// Forzamos parseo en hora local agregando la hora explícita.
export function parseFechaLocal(fecha: string) {
  return new Date(`${fecha}T00:00:00`);
}
