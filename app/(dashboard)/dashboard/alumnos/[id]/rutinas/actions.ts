"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  routineDayNameSchema,
  routineFormSchema,
  routineInfoFormSchema,
  type RoutineFormValues,
  type RoutineInfoFormValues,
} from "@/lib/validations/routine";

export async function createRoutine(memberId: string, values: RoutineFormValues) {
  const parsed = routineFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: routine, error } = await supabase
      .from("routines")
      .insert({
        gym_id: gymId,
        member_id: memberId,
        title: data.title,
        month_number: data.month_number === "ninguno" ? null : Number(data.month_number),
        notes: data.notes || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !routine) {
      return { error: "No pudimos crear la rutina. Intentá de nuevo." };
    }

    const daysToInsert = data.days.map((day, index) => ({
      routine_id: routine.id,
      day_number: index + 1,
      order_index: index,
      name: day.name,
    }));

    const { error: daysError } = await supabase.from("routine_days").insert(daysToInsert);

    if (daysError) {
      await supabase.from("routines").delete().eq("id", routine.id);
      return { error: "No pudimos crear los días de la rutina. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    return { success: true as const, routineId: routine.id as string };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteRoutine(routineId: string, memberId: string) {
  const supabase = await createClient();

  const { data: days } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", routineId);
  const dayIds = (days ?? []).map((day) => day.id);

  if (dayIds.length > 0) {
    await supabase.from("routine_exercises").delete().in("routine_day_id", dayIds);
  }
  await supabase.from("routine_days").delete().eq("routine_id", routineId);

  const { error } = await supabase.from("routines").delete().eq("id", routineId);

  if (error) {
    return { error: "No pudimos eliminar la rutina. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${memberId}`);
  return { success: true as const };
}

export async function updateRoutineInfo(
  routineId: string,
  memberId: string,
  values: RoutineInfoFormValues
) {
  const parsed = routineInfoFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("routines")
    .update({
      title: data.title,
      month_number: data.month_number === "ninguno" ? null : Number(data.month_number),
      notes: data.notes || null,
    })
    .eq("id", routineId);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
  return { success: true as const };
}

export async function addRoutineDay(routineId: string, memberId: string, name: string) {
  const parsed = routineDayNameSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: "Ponele un nombre a este día." };
  }

  const supabase = await createClient();
  const { data: days } = await supabase
    .from("routine_days")
    .select("day_number, order_index")
    .eq("routine_id", routineId);

  const maxDayNumber = (days ?? []).reduce((max, day) => Math.max(max, day.day_number), 0);
  const maxOrderIndex = (days ?? []).reduce((max, day) => Math.max(max, day.order_index), -1);

  const { data: inserted, error } = await supabase
    .from("routine_days")
    .insert({
      routine_id: routineId,
      name: parsed.data.name,
      day_number: maxDayNumber + 1,
      order_index: maxOrderIndex + 1,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "No pudimos agregar el día. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
  return { success: true as const, dayId: inserted.id as string };
}

export async function renameRoutineDay(
  dayId: string,
  routineId: string,
  memberId: string,
  name: string
) {
  const parsed = routineDayNameSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: "Ponele un nombre a este día." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_days")
    .update({ name: parsed.data.name })
    .eq("id", dayId);

  if (error) {
    return { error: "No pudimos renombrar el día. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
  return { success: true as const };
}

export async function deleteRoutineDay(dayId: string, routineId: string, memberId: string) {
  const supabase = await createClient();

  await supabase.from("routine_exercises").delete().eq("routine_day_id", dayId);
  const { error } = await supabase.from("routine_days").delete().eq("id", dayId);

  if (error) {
    return { error: "No pudimos eliminar el día. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
  return { success: true as const };
}
