import { getDatePartsInBA } from "@/lib/attendance";
import { getMembershipStatus, type MembershipStatusLabel } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import type {
  Member,
  Membership,
  PaymentWithMember,
  RetentionAlertWithDetails,
} from "@/types/db";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// Mismo patrón que `getStartOfDayISO`/`getEndOfDayISO` de lib/attendance.ts,
// pero para límites de mes calendario en horario de Argentina (no del
// servidor). El límite superior es exclusivo (primer instante del mes
// siguiente).
function getMonthRangeISO(date: Date) {
  const { year, month } = getDatePartsInBA(date);
  const start = `${year}-${pad(month)}-01T00:00:00-03:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${pad(nextMonth)}-01T00:00:00-03:00`;
  return { start, end };
}

export async function getActiveMembersCount(gymId: string) {
  const supabase = await createClient();

  const hace30Dias = new Date();
  hace30Dias.setUTCDate(hace30Dias.getUTCDate() - 30);
  const { year, month, day } = getDatePartsInBA(hace30Dias);
  const hace30DiasStr = `${year}-${pad(month)}-${pad(day)}`;

  const [{ count: countActual }, { count: countHace30Dias }] = await Promise.all([
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("status", "active"),
    // Aproximación simple (no un snapshot histórico real): alumnos activos
    // hoy que ya se habían dado de alta hace 30 días o más. No contempla
    // alumnos que se dieron de baja en el medio, pero alcanza para mostrar
    // una tendencia de "cuántos alumnos netos sumamos este mes".
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("status", "active")
      .lte("joined_at", hace30DiasStr),
  ]);

  const count = countActual ?? 0;
  const previo = countHace30Dias ?? 0;

  return { count, delta: count - previo };
}

export async function getMonthlyRevenue(gymId: string) {
  const supabase = await createClient();
  const { start, end } = getMonthRangeISO(new Date());

  const { data } = await supabase
    .from("payments")
    .select("amount")
    .eq("gym_id", gymId)
    .gte("paid_at", start)
    .lt("paid_at", end);

  return (data ?? []).reduce((total, pago) => total + Number(pago.amount), 0);
}

export async function getWeeklyAttendanceRate(gymId: string) {
  const supabase = await createClient();

  const { data: activos } = await supabase
    .from("members")
    .select("id")
    .eq("gym_id", gymId)
    .eq("status", "active");

  const activeIds = (activos ?? []).map((m) => m.id);
  if (activeIds.length === 0) return 0;

  const hace7Dias = new Date();
  hace7Dias.setUTCDate(hace7Dias.getUTCDate() - 7);

  const { data: asistencias } = await supabase
    .from("attendances")
    .select("member_id")
    .eq("gym_id", gymId)
    .in("member_id", activeIds)
    .gte("checked_in_at", hace7Dias.toISOString());

  const conAsistencia = new Set((asistencias ?? []).map((a) => a.member_id));

  return Math.round((conAsistencia.size / activeIds.length) * 100);
}

// "Abiertas" = `active` + `contacted`, mismo criterio que ya usa la página
// de Inicio (resumen general) desde el Bloque B de retención — distinto del
// badge del sidebar, que cuenta solo `active` a propósito.
export async function getOpenRetentionAlertsCount(gymId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("retention_alerts")
    .select("*", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .in("status", ["active", "contacted"]);

  return count ?? 0;
}

export type AttendanceDayCount = { date: string; label: string; count: number };

export async function getAttendanceLast14Days(gymId: string): Promise<AttendanceDayCount[]> {
  const supabase = await createClient();

  const hoy = new Date();
  const hace13Dias = new Date();
  hace13Dias.setUTCDate(hace13Dias.getUTCDate() - 13);
  const { year, month, day } = getDatePartsInBA(hace13Dias);
  const desde = `${year}-${pad(month)}-${pad(day)}T00:00:00-03:00`;

  const { data } = await supabase
    .from("attendances")
    .select("checked_in_at")
    .eq("gym_id", gymId)
    .gte("checked_in_at", desde);

  const countsByDate = new Map<string, number>();
  for (const attendance of data ?? []) {
    const parts = getDatePartsInBA(new Date(attendance.checked_in_at));
    const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const dias: AttendanceDayCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const fecha = new Date();
    fecha.setUTCDate(hoy.getUTCDate() - i);
    const parts = getDatePartsInBA(fecha);
    const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    dias.push({
      date: key,
      label: `${pad(parts.day)}/${pad(parts.month)}`,
      count: countsByDate.get(key) ?? 0,
    });
  }

  return dias;
}

export type MembershipStatusBreakdown = Record<MembershipStatusLabel, number>;

export async function getMembershipStatusBreakdown(
  gymId: string
): Promise<MembershipStatusBreakdown> {
  const supabase = await createClient();

  const [{ data: members }, { data: memberships }] = await Promise.all([
    supabase.from("members").select("id").eq("gym_id", gymId).eq("status", "active"),
    supabase
      .from("memberships")
      .select("member_id, status, end_date")
      .eq("gym_id", gymId)
      .eq("status", "active"),
  ]);

  const membershipByMember = new Map<string, Pick<Membership, "status" | "end_date">>();
  for (const membership of memberships ?? []) {
    membershipByMember.set(membership.member_id, membership);
  }

  const breakdown: MembershipStatusBreakdown = {
    al_dia: 0,
    vence_pronto: 0,
    vencido: 0,
    sin_plan: 0,
  };

  for (const member of members ?? []) {
    const status = getMembershipStatus(membershipByMember.get(member.id) ?? null);
    breakdown[status]++;
  }

  return breakdown;
}

export async function getRecentRetentionAlerts(gymId: string, limit = 5) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("retention_alerts")
    .select(
      "*, members(id, first_name, last_name, phone, photo_url, weekly_frequency, status), retention_rules(id, name, days_without_attendance)"
    )
    .eq("gym_id", gymId)
    .in("status", ["active", "contacted"])
    .order("triggered_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as RetentionAlertWithDetails[];
}

export async function getRecentPayments(gymId: string, limit = 5) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("payments")
    .select("*, members(id, first_name, last_name, phone, photo_url)")
    .eq("gym_id", gymId)
    .order("paid_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as PaymentWithMember[];
}

export type UpcomingBirthday = {
  member: Pick<Member, "id" | "first_name" | "last_name" | "photo_url">;
  label: string;
  daysUntil: number;
};

const BIRTHDAY_WINDOW_DAYS = 30;

export async function getUpcomingBirthdays(gymId: string): Promise<UpcomingBirthday[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("members")
    .select("id, first_name, last_name, photo_url, birth_date")
    .eq("gym_id", gymId)
    .eq("status", "active")
    .not("birth_date", "is", null);

  const hoy = getDatePartsInBA(new Date());
  const hoyUTC = Date.UTC(hoy.year, hoy.month - 1, hoy.day);

  const cumpleanos: UpcomingBirthday[] = [];

  for (const member of data ?? []) {
    if (!member.birth_date) continue;
    const [, birthMonth, birthDay] = member.birth_date.split("-").map(Number);

    let candidateUTC = Date.UTC(hoy.year, birthMonth - 1, birthDay);
    if (candidateUTC < hoyUTC) {
      candidateUTC = Date.UTC(hoy.year + 1, birthMonth - 1, birthDay);
    }

    const daysUntil = Math.round((candidateUTC - hoyUTC) / (1000 * 60 * 60 * 24));
    if (daysUntil > BIRTHDAY_WINDOW_DAYS) continue;

    cumpleanos.push({
      member: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        photo_url: member.photo_url,
      },
      label: `${pad(birthDay)}/${pad(birthMonth)}`,
      daysUntil,
    });
  }

  return cumpleanos.sort((a, b) => a.daysUntil - b.daysUntil);
}
