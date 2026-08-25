import type { GymSettings } from "@/lib/retention";

// Deliberadamente sin imports de Node (nada de `crypto`, `fs`, etc.): este
// archivo lo importan tanto Server Components/Actions como Client
// Components (la card de QR en la ficha del alumno arma estas URLs para
// codificarlas en la imagen y en el link de WhatsApp). `generateQrToken()`
// SÍ necesita el módulo `crypto` de Node y por eso vive aparte, en
// alumnos/[id]/actions.ts (que es "use server" puro) — mezclarlo acá
// rompería el bundle de cliente.

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// URL que se codifica DENTRO de la imagen del QR — al escanearla (con la
// cámara del kiosco o con la cámara del propio celular del alumno) navega
// acá y dispara el check-in.
export function buildCheckinScanUrl(gymSlug: string, token: string): string {
  return `${getSiteUrl()}/checkin/${gymSlug}/scan?token=${encodeURIComponent(token)}`;
}

// URL de la tarjeta personal del alumno (para el link de WhatsApp) — una
// página linda para ver/descargar el QR, no la URL que el QR codifica.
export function buildMiQrUrl(gymSlug: string, token: string): string {
  return `${getSiteUrl()}/checkin/${gymSlug}/mi-qr/${encodeURIComponent(token)}`;
}

export function getKioskPin(settings: GymSettings | null | undefined): string | null {
  return settings?.kiosk_pin?.trim() || null;
}
