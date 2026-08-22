"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { getEndOfDayISO, getStartOfDayISO } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";

type MarkAttendanceResult =
  | { error: string }
  | { success: true; attendance: { id: string; checked_in_at: string } };

export async function markAttendance(memberId: string): Promise<MarkAttendanceResult> {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("id", memberId)
      .eq("gym_id", gymId)
      .single();

    if (!member) {
      return { error: "No encontramos ese alumno." };
    }

    const { data: existing } = await supabase
      .from("attendances")
      .select("id")
      .eq("member_id", memberId)
      .gte("checked_in_at", getStartOfDayISO())
      .lt("checked_in_at", getEndOfDayISO())
      .maybeSingle();

    if (existing) {
      return { error: "Ya se marcó asistencia hoy." };
    }

    const { data: attendance, error } = await supabase
      .from("attendances")
      .insert({
        gym_id: gymId,
        member_id: memberId,
        checked_in_by: user?.id ?? null,
      })
      .select("id, checked_in_at")
      .single();

    if (error || !attendance) {
      if (error?.code === "23505") {
        return { error: "Ya se marcó asistencia hoy." };
      }
      return { error: "No pudimos marcar la asistencia. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/asistencia");
    revalidatePath(`/dashboard/alumnos/${memberId}`);

    return {
      success: true as const,
      attendance: attendance as { id: string; checked_in_at: string },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function unmarkAttendance(attendanceId: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: attendance } = await supabase
      .from("attendances")
      .select("id, gym_id, member_id")
      .eq("id", attendanceId)
      .single();

    if (!attendance || attendance.gym_id !== gymId) {
      return { error: "No encontramos esa asistencia." };
    }

    const { error } = await supabase.from("attendances").delete().eq("id", attendanceId);

    if (error) {
      return { error: "No pudimos deshacer la asistencia. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/asistencia");
    revalidatePath(`/dashboard/alumnos/${attendance.member_id}`);

    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
