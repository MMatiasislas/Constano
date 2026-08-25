import type {
  ApplyToFrequencyValue,
  ResolutionReasonValue,
  RetentionAlertStatus,
  RetentionRule,
} from "@/types/db";
import { RESOLUTION_REASON_OPTIONS } from "@/types/db";

// `applies_to_frequency` en la tabla es un int nullable: `null` = todos los
// alumnos, `0` es un sentinel para "plan libre" (weekly_frequency IS NULL en
// members), y 1-6 significa "esa frecuencia o más". El 0 nunca colisiona con
// una frecuencia real porque weekly_frequency arranca en 1.
export function formatFrequency(value: number | null) {
  if (value === null) return "Todos";
  if (value === 0) return "Plan libre";
  return `${value}x/sem o más`;
}

export function frequencyOptionToDbValue(value: ApplyToFrequencyValue): number | null {
  if (value === "all") return null;
  if (value === "free") return 0;
  return Number(value);
}

export function dbValueToFrequencyOption(value: number | null): ApplyToFrequencyValue {
  if (value === null) return "all";
  if (value === 0) return "free";
  return String(value) as ApplyToFrequencyValue;
}

export type DefaultRetentionRule = {
  name: string;
  days_without_attendance: number;
  applies_to_frequency: ApplyToFrequencyValue;
};

// Sugeridas en el estado vacío de la pantalla de configuración. A propósito
// NO se insertan solas al crear el gym — el usuario elige si quiere usarlas.
export function getDefaultRules(): DefaultRetentionRule[] {
  return [
    { name: "Alerta estándar", days_without_attendance: 10, applies_to_frequency: "all" },
    { name: "Alerta premium", days_without_attendance: 5, applies_to_frequency: "3" },
  ];
}

// --- Motor de alertas (Bloque B) ---

export function ruleAppliesToMember(rule: RetentionRule, weeklyFrequency: number | null) {
  if (rule.applies_to_frequency === null) return true;
  if (rule.applies_to_frequency === 0) return weeklyFrequency === null;
  return weeklyFrequency !== null && weeklyFrequency >= rule.applies_to_frequency;
}

// Entre todas las reglas activas que le aplican al alumno y cuyo umbral ya se
// cumplió, se elige la de `days_without_attendance` más alto (la más
// "exigente" disparada) para no generar una alerta por cada regla que matchee
// a la vez — ej. un alumno de 3x/sem que no viene hace 12 días cumple tanto
// "Alerta estándar" (10 días/todos) como "Alerta premium" (5 días/3x·sem+);
// se prioriza la premium.
export function findTriggeredRule(
  rules: RetentionRule[],
  weeklyFrequency: number | null,
  daysWithoutAttendance: number
): RetentionRule | null {
  const applicable = rules.filter(
    (rule) =>
      rule.active &&
      ruleAppliesToMember(rule, weeklyFrequency) &&
      daysWithoutAttendance >= rule.days_without_attendance
  );

  if (applicable.length === 0) return null;

  return applicable.reduce((max, rule) =>
    rule.days_without_attendance > max.days_without_attendance ? rule : max
  );
}

export const ALERT_STATUS_LABELS: Record<RetentionAlertStatus, string> = {
  active: "Activa",
  contacted: "Contactada",
  resolved: "Resuelta",
  dismissed: "Descartada",
};

export const ALERT_STATUS_BADGE: Record<RetentionAlertStatus, string> = {
  active: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  contacted: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  resolved: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  dismissed: "border-transparent bg-muted text-muted-foreground",
};

const RESOLUTION_REASON_LABELS = Object.fromEntries(
  RESOLUTION_REASON_OPTIONS.map((option) => [option.value, option.label])
) as Record<ResolutionReasonValue, string>;

export function resolutionReasonLabel(reason: string | null) {
  if (!reason) return null;
  return RESOLUTION_REASON_LABELS[reason as ResolutionReasonValue] ?? reason;
}

// --- Mensaje de WhatsApp configurable (Bloque C) ---

// `gyms.settings` es jsonb de propósito general (da lugar a sumar más config
// a futuro sin migraciones nuevas). `kiosk_pin` se sumó en Semana 8 Bloque B
// (PIN de 4 dígitos para salir del modo kiosco de check-in por QR, ver
// lib/qr-checkin.ts) — sigue viviendo acá porque este es el único lugar del
// proyecto que ya representa la forma completa de `gyms.settings`.
export type GymSettings = {
  retention_message?: string | null;
  kiosk_pin?: string | null;
};

export const DEFAULT_WHATSAPP_TEMPLATE =
  "Hola {nombre}! ¿Todo bien? Te esperamos en el gimnasio, hace {dias} días que no te vemos. ¿Necesitás que te ayudemos con algo?";

export function getWhatsAppTemplate(gymSettings: GymSettings | null | undefined): string {
  return gymSettings?.retention_message?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
}

export function renderWhatsAppMessage(
  template: string,
  memberName: string,
  days: number,
  gymName: string
): string {
  return template
    .replaceAll("{nombre}", memberName)
    .replaceAll("{dias}", String(days))
    .replaceAll("{gym}", gymName);
}

// `template` es el valor crudo de `gyms.settings.retention_message` (puede
// venir `null`/vacío si el gym no personalizó nada) — acá se resuelve el
// default, no hace falta llamar a `getWhatsAppTemplate` antes.
export function buildWhatsAppMessage(
  memberName: string,
  days: number,
  gymName: string,
  template?: string | null
): string {
  const resolved = template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
  return renderWhatsAppMessage(resolved, memberName, days, gymName);
}
