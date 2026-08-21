"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  duplicateRoutineSchema,
  routineExerciseDetailsSchema,
  routineExerciseSchema,
  type DuplicateRoutineValues,
  type RoutineExerciseDetailsValues,
} from "@/lib/validations/routine";
import type { RoutineDay, RoutineExercise } from "@/types/db";

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

export async function duplicateRoutine(
  routineId: string,
  memberId: string,
  values: DuplicateRoutineValues
) {
  const parsed = duplicateRoutineSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: original } = await supabase
      .from("routines")
      .select("*, routine_days(*, routine_exercises(*))")
      .eq("id", routineId)
      .eq("gym_id", gymId)
      .single();

    if (!original || original.member_id !== memberId) {
      return { error: "No encontramos esa rutina." };
    }

    const { data: newRoutine, error } = await supabase
      .from("routines")
      .insert({
        gym_id: gymId,
        member_id: memberId,
        title: parsed.data.title,
        month_number:
          parsed.data.month_number === "ninguno" ? null : Number(parsed.data.month_number),
        notes: original.notes,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !newRoutine) {
      return { error: "No pudimos duplicar la rutina. Intentá de nuevo." };
    }

    const days = (
      (original.routine_days ?? []) as (RoutineDay & { routine_exercises: RoutineExercise[] })[]
    ).sort((a, b) => a.order_index - b.order_index);

    for (const day of days) {
      const { data: newDay, error: dayError } = await supabase
        .from("routine_days")
        .insert({
          routine_id: newRoutine.id,
          day_number: day.day_number,
          order_index: day.order_index,
          name: day.name,
        })
        .select("id")
        .single();

      if (dayError || !newDay) {
        await supabase.from("routines").delete().eq("id", newRoutine.id);
        return { error: "No pudimos duplicar los días de la rutina. Intentá de nuevo." };
      }

      const exercises = [...(day.routine_exercises ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      );

      if (exercises.length > 0) {
        const { error: exercisesError } = await supabase.from("routine_exercises").insert(
          exercises.map((exercise) => ({
            routine_day_id: newDay.id,
            name: exercise.name,
            muscle_group: exercise.muscle_group,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            rest_seconds: exercise.rest_seconds,
            notes: exercise.notes,
            order_index: exercise.order_index,
          }))
        );

        if (exercisesError) {
          await supabase.from("routines").delete().eq("id", newRoutine.id);
          return { error: "No pudimos duplicar los ejercicios de la rutina. Intentá de nuevo." };
        }
      }
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    return { success: true as const, routineId: newRoutine.id as string };
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
