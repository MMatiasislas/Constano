"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { exerciseFormSchema, type ExerciseFormValues } from "@/lib/validations/exercise";

export async function createExercise(values: ExerciseFormValues) {
  const parsed = exerciseFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("exercises_library")
      .select("id")
      .eq("gym_id", gymId)
      .ilike("name", data.name)
      .maybeSingle();

    if (existing) {
      return { error: "Ya tenés un ejercicio con ese nombre." };
    }

    const { error } = await supabase.from("exercises_library").insert({
      gym_id: gymId,
      name: data.name,
      muscle_group: data.muscle_group === "ninguno" ? null : data.muscle_group,
    });

    if (error) {
      return { error: "No pudimos crear el ejercicio. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/ejercicios");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function updateExercise(id: string, values: ExerciseFormValues) {
  const parsed = exerciseFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("exercises_library")
      .select("id")
      .eq("gym_id", gymId)
      .ilike("name", data.name)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return { error: "Ya tenés un ejercicio con ese nombre." };
    }

    const { error } = await supabase
      .from("exercises_library")
      .update({
        name: data.name,
        muscle_group: data.muscle_group === "ninguno" ? null : data.muscle_group,
      })
      .eq("id", id);

    if (error) {
      return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/ejercicios");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteExercise(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exercises_library").delete().eq("id", id);

  if (error) {
    return { error: "No pudimos eliminar el ejercicio. Intentá de nuevo." };
  }

  revalidatePath("/dashboard/ejercicios");
  return { success: true as const };
}
