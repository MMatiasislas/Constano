import { addDays } from "date-fns";

import { getDatePartsInBA } from "@/lib/attendance";
import { parseFechaLocal } from "@/lib/members";
import type { Membership } from "@/types/db";

export type MembershipStatusLabel = "sin_plan" | "al_dia" | "vence_pronto" | "vencido";

const VENCE_PRONTO_DAYS = 7;

// Días corridos entre "hoy" (en horario de Argentina) y `endDate` (columna
// `date` de Postgres, "YYYY-MM-DD"). Positivo = todavía falta, negativo = ya
// venció. Se compara por fecha calendario pura (sin horas), parseando
// `endDate` a mano en vez de `new Date(endDate)` para no repetir el bug de
// timezone documentado en `parseFechaLocal`.
export function diasHastaVencimiento(endDate: string, hoy: Date = new Date()) {
  const [year, month, day] = endDate.split("-").map(Number);
  const endUTC = Date.UTC(year, month - 1, day);

  const hoyParts = getDatePartsInBA(hoy);
  const hoyUTC = Date.UTC(hoyParts.year, hoyParts.month - 1, hoyParts.day);

  return Math.round((endUTC - hoyUTC) / (1000 * 60 * 60 * 24));
}

export function calcularFechaVencimiento(startDate: string, durationDays: number) {
  return addDays(parseFechaLocal(startDate), durationDays);
}

// No hay cron: `status` en la tabla se queda en 'active' aunque ya haya
// vencido (nadie la pasa a 'expired' automáticamente). El estado que se
// muestra ("vencido"/"vence_pronto") se calcula siempre comparando fechas,
// no confiando solo en la columna `status`.
export function getMembershipStatus(
  membership: Pick<Membership, "status" | "end_date"> | null,
  hoy: Date = new Date()
): MembershipStatusLabel {
  if (!membership || membership.status !== "active") return "sin_plan";

  const dias = diasHastaVencimiento(membership.end_date, hoy);
  if (dias < 0) return "vencido";
  if (dias <= VENCE_PRONTO_DAYS) return "vence_pronto";
  return "al_dia";
}

export function getMembershipStatusLabel(status: MembershipStatusLabel) {
  switch (status) {
    case "al_dia":
      return "Al día";
    case "vence_pronto":
      return "Vence pronto";
    case "vencido":
      return "Vencido";
    case "sin_plan":
      return "Sin plan asignado";
  }
}

export function getMembershipStatusColor(status: MembershipStatusLabel) {
  switch (status) {
    case "al_dia":
      return "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "vence_pronto":
      return "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "vencido":
      return "border-transparent bg-red-500/15 text-red-700 dark:text-red-400";
    case "sin_plan":
      return "border-transparent bg-muted text-muted-foreground";
  }
}
