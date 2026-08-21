"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  routineExerciseDetailsSchema,
  routineExerciseSchema,
  type RoutineExerciseDetailsValues,
} from "@/lib/validations/routine";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function getRoutineDayContext(supabase: Supabase, gymId: string, routineDayId: string) {
  const { data: day } = await supabase
    .from("routine_days")
    .select("routine_id")
    .eq("id", routineDayId)
    .single();

  if (!day) {
    throw new Error("No encontramos ese día de rutina.");
  }

  const { data: routine } = await supabase
    .from("routines")
    .select("id, gym_id, member_id")
    .eq("id", day.routine_id)
    .single();

  if (!routine || routine.gym_id !== gymId) {
    throw new Error("No tenés acceso a este día de rutina.");
  }

  return { routineId: routine.id as string, memberId: routine.member_id as string };
}

function toNullableInt(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toNullableFloat(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function addExerciseToDay(
  routineDayId: string,
  data: { name: string; muscle_group: string | null } & RoutineExerciseDetailsValues
) {
  const parsed = routineExerciseSchema.safeParse({
    name: data.name,
    muscle_group: data.muscle_group ?? undefined,
    sets: data.sets,
    reps: data.reps,
    weight: data.weight,
    rest_seconds: data.rest_seconds,
    notes: data.notes,
  });

  if (!parsed.success) {
    return { error: "Revisá los datos del ejercicio." };
  }

  const values = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const { routineId, memberId } = await getRoutineDayContext(supabase, gymId, routineDayId);

    const { data: existing } = await supabase
      .from("routine_exercises")
      .select("order_index")
      .eq("routine_day_id", routineDayId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = (existing?.[0]?.order_index ?? -1) + 1;

    const { error } = await supabase.from("routine_exercises").insert({
      routine_day_id: routineDayId,
      name: values.name,
      muscle_group: values.muscle_group || null,
      sets: toNullableInt(values.sets),
      reps: values.reps || null,
      weight: toNullableFloat(values.weight),
      rest_seconds: toNullableInt(values.rest_seconds),
      notes: values.notes || null,
      order_index: nextOrderIndex,
    });

    if (error) {
      return { error: "No pudimos agregar el ejercicio. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function updateExercise(exerciseId: string, details: RoutineExerciseDetailsValues) {
  const parsed = routineExerciseDetailsSchema.safeParse(details);

  if (!parsed.success) {
    return { error: "Revisá los datos del ejercicio." };
  }

  const values = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: exercise } = await supabase
      .from("routine_exercises")
      .select("routine_day_id")
      .eq("id", exerciseId)
      .single();

    if (!exercise) {
      return { error: "No encontramos ese ejercicio." };
    }

    const { routineId, memberId } = await getRoutineDayContext(
      supabase,
      gymId,
      exercise.routine_day_id
    );

    const { error } = await supabase
      .from("routine_exercises")
      .update({
        sets: toNullableInt(values.sets),
        reps: values.reps || null,
        weight: toNullableFloat(values.weight),
        rest_seconds: toNullableInt(values.rest_seconds),
        notes: values.notes || null,
      })
      .eq("id", exerciseId);

    if (error) {
      return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteExercise(exerciseId: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: exercise } = await supabase
      .from("routine_exercises")
      .select("routine_day_id")
      .eq("id", exerciseId)
      .single();

    if (!exercise) {
      return { error: "No encontramos ese ejercicio." };
    }

    const { routineId, memberId } = await getRoutineDayContext(
      supabase,
      gymId,
      exercise.routine_day_id
    );

    const { error } = await supabase.from("routine_exercises").delete().eq("id", exerciseId);

    if (error) {
      return { error: "No pudimos eliminar el ejercicio. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function reorderExercises(routineDayId: string, orderedIds: string[]) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const { routineId, memberId } = await getRoutineDayContext(supabase, gymId, routineDayId);

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("routine_exercises")
          .update({ order_index: index })
          .eq("id", id)
          .eq("routine_day_id", routineDayId)
      )
    );

    if (results.some((result) => result.error)) {
      return { error: "No pudimos guardar el nuevo orden. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}/rutinas/${routineId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
