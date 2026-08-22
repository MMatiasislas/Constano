import { daysSinceInBA } from "@/lib/attendance";
import { findTriggeredRule } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import type { RetentionRule } from "@/types/db";

// Recalcula las alertas de retención del gym. No hay cron ni background jobs
// en el proyecto (Next.js en Vercel, sin infra propia) — se llama en cada
// carga de /dashboard/retencion.
//
// Idempotencia por "racha de ausencia", no por estado de la alerta: un
// alumno no genera una alerta nueva mientras su última alerta (de cualquier
// estado, incluida una ya resuelta/descartada) haya sido disparada durante
// la MISMA racha sin venir (`triggered_at` >= fecha de referencia actual).
// Si solo mirásemos "no tiene alerta abierta", resolver/descartar una alerta
// la volvería a crear en la carga siguiente de la página porque el alumno
// sigue sin asistencia real — se probó y pasaba. Distinto es si el alumno
// vuelve a asistir: ahí la fecha de referencia avanza, la alerta vieja queda
// "antes" de la nueva racha, y si después vuelve a faltar se genera una
// alerta nueva de verdad.
export async function syncRetentionAlerts(gymId: string) {
  const supabase = await createClient();

  const [{ data: members }, { data: rules }, { data: alerts }] = await Promise.all([
    supabase
      .from("members")
      .select("id, weekly_frequency, joined_at")
      .eq("gym_id", gymId)
      .eq("status", "active"),
    supabase.from("retention_rules").select("*").eq("gym_id", gymId).eq("active", true),
    supabase.from("retention_alerts").select("member_id, triggered_at").eq("gym_id", gymId),
  ]);

  if (!members || members.length === 0 || !rules || rules.length === 0) return;

  const lastAlertByMember = new Map<string, string>();
  for (const alert of alerts ?? []) {
    const current = lastAlertByMember.get(alert.member_id);
    if (!current || alert.triggered_at > current) {
      lastAlertByMember.set(alert.member_id, alert.triggered_at);
    }
  }

  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id, checked_in_at")
    .in(
      "member_id",
      members.map((member) => member.id)
    )
    .order("checked_in_at", { ascending: false });

  const lastAttendanceByMember = new Map<string, string>();
  for (const attendance of attendances ?? []) {
    if (!lastAttendanceByMember.has(attendance.member_id)) {
      lastAttendanceByMember.set(attendance.member_id, attendance.checked_in_at);
    }
  }

  const toInsert = [];

  for (const member of members) {
    const referenceDate = lastAttendanceByMember.get(member.id) ?? member.joined_at;
    const daysWithoutAttendance = daysSinceInBA(referenceDate);

    const triggeredRule = findTriggeredRule(
      rules as RetentionRule[],
      member.weekly_frequency,
      daysWithoutAttendance
    );
    if (!triggeredRule) continue;

    const lastAlertAt = lastAlertByMember.get(member.id);
    const yaAlertadoEnEstaRacha = lastAlertAt && new Date(lastAlertAt) >= new Date(referenceDate);
    if (yaAlertadoEnEstaRacha) continue;

    toInsert.push({
      gym_id: gymId,
      member_id: member.id,
      rule_id: triggeredRule.id,
      days_without_attendance: daysWithoutAttendance,
      status: "active" as const,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("retention_alerts").insert(toInsert);
  }
}
