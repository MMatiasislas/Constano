import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import type { Attendance } from "@/types/db";

const BA_TIMEZONE = "America/Argentina/Buenos_Aires";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// Extrae año/mes/día tal como se ven en horario de Argentina, sin importar
// en qué timezone corra el server. Necesario porque `new Date().getDate()`
// devuelve el día en la timezone del proceso (UTC en Vercel), no en Buenos Aires.
export function getDatePartsInBA(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

export function formatearHoraCheckIn(timestamp: string) {
  return format(new Date(timestamp), "HH:mm");
}

export function getStartOfDayISO(date: Date = new Date()) {
  const { year, month, day } = getDatePartsInBA(date);
  return `${year}-${pad(month)}-${pad(day)}T00:00:00-03:00`;
}

export function getEndOfDayISO(date: Date = new Date()) {
  const { year, month, day } = getDatePartsInBA(date);
  return `${year}-${pad(month)}-${pad(day)}T23:59:59.999-03:00`;
}

export function calcularAsistenciasMes(attendances: Attendance[], mes: number, anio: number) {
  return attendances.filter((attendance) => {
    const parts = getDatePartsInBA(new Date(attendance.checked_in_at));
    return parts.year === anio && parts.month === mes;
  }).length;
}

export function calcularAsistenciasSemana(attendances: Attendance[], hoy: Date = new Date()) {
  const { year, month, day } = getDatePartsInBA(hoy);
  const today = new Date(Date.UTC(year, month - 1, day));
  const weekday = today.getUTCDay();
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;

  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return attendances.filter((attendance) => {
    const parts = getDatePartsInBA(new Date(attendance.checked_in_at));
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return d >= monday && d <= sunday;
  }).length;
}

// Días corridos entre una fecha (`fromISO`, ej. última asistencia o alta del
// alumno) y "hoy", ambos calculados en horario de Argentina — usado por el
// motor de alertas de retención para no depender de la timezone del server.
export function daysSinceInBA(fromISO: string, hoy: Date = new Date()) {
  const from = getDatePartsInBA(new Date(fromISO));
  const to = getDatePartsInBA(hoy);
  const fromUTC = Date.UTC(from.year, from.month - 1, from.day);
  const toUTC = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUTC - fromUTC) / (1000 * 60 * 60 * 24));
}

export function ultimaAsistenciaTexto(attendances: Attendance[]) {
  if (attendances.length === 0) return null;

  const masReciente = [...attendances].sort((a, b) =>
    b.checked_in_at.localeCompare(a.checked_in_at)
  )[0];

  return formatDistanceToNow(new Date(masReciente.checked_in_at), {
    locale: es,
    addSuffix: true,
  });
}

export type CalendarDay = {
  date: Date;
  dayNumber: number;
  isToday: boolean;
  hasAttendance: boolean;
} | null;

// Grilla de semanas de lunes a domingo. Las celdas fuera del mes actual son
// `null` (se renderizan vacías) en vez de mostrar días de otros meses.
export function getMonthCalendar(
  mes: number,
  anio: number,
  attendances: Attendance[]
): CalendarDay[] {
  const firstOfMonth = new Date(anio, mes - 1, 1);
  const daysInMonth = new Date(anio, mes, 0).getDate();
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;

  const attendanceDays = new Set(
    attendances.map((attendance) => {
      const parts = getDatePartsInBA(new Date(attendance.checked_in_at));
      return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    })
  );

  const today = getDatePartsInBA(new Date());

  const days: CalendarDay[] = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: new Date(anio, mes - 1, day),
      dayNumber: day,
      isToday: today.year === anio && today.month === mes && today.day === day,
      hasAttendance: attendanceDays.has(`${anio}-${pad(mes)}-${pad(day)}`),
    });
  }

  return days;
}
