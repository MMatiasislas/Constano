import { getSiteUrl } from "@/lib/qr-checkin";

// Todavía sin uso desde el dialog de invitar (ese arma el link client-side
// con `window.location.origin`, ver el comentario en
// app/(dashboard)/dashboard/configuracion/equipo/actions.ts) — queda lista
// para cuando se integre el envío automático por email (TODO ahí mismo:
// Resend), que sí corre server-side y necesita la URL absoluta armada acá.
export function buildInvitationUrl(token: string): string {
  return `${getSiteUrl()}/invitacion/${token}`;
}
