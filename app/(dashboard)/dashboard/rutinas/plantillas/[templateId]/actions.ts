"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  routineExerciseDetailsSchema,
  routineExerciseSchema,
  type RoutineExerciseDetailsValues,
} from "@/lib/validations/routine";
import {
  templateDayNameSchema,
  templateUpdateSchema,
  type TemplateUpdateValues,
} from "@/lib/validations/routine-template";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function getTemplateContext(supabase: Supabase, gymId: string, templateId: string) {
  const { data: template } = await supabase
    .from("routine_templates")
    .select("id, gym_id")
    .eq("id", templateId)
    .single();

  if (!template || template.gym_id !== gymId) {
    throw new Error("No tenés acceso a esa plantilla.");
  }

  return { templateId: template.id as string };
}

async function getTemplateDayContext(supabase: Supabase, gymId: string, templateDayId: string) {
  const { data: day } = await supabase
    .from("routine_template_days")
    .select("template_id")
    .eq("id", templateDayId)
    .single();

  if (!day) {
    throw new Error("No encontramos ese día de la plantilla.");
  }

  const { data: template } = await supabase
    .from("routine_templates")
    .select("id, gym_id")
    .eq("id", day.template_id)
    .single();

  if (!template || template.gym_id !== gymId) {
    throw new Error("No tenés acceso a este día de la plantilla.");
  }

  return { templateId: template.id as string };
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

export async function updateTemplateInfo(templateId: string, values: TemplateUpdateValues) {
  const parsed = templateUpdateSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("routine_templates")
      .update({ name: data.name, description: data.description || null })
      .eq("id", templateId)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    revalidatePath("/dashboard/rutinas/plantillas");
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function addTemplateDay(templateId: string, name: string) {
  const parsed = templateDayNameSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: "Ponele un nombre a este día." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    await getTemplateContext(supabase, gymId, templateId);

    const { data: days } = await supabase
      .from("routine_template_days")
      .select("day_number, order_index")
      .eq("template_id", templateId);

    const maxDayNumber = (days ?? []).reduce((max, day) => Math.max(max, day.day_number), 0);
    const maxOrderIndex = (days ?? []).reduce((max, day) => Math.max(max, day.order_index), -1);

    const { data: inserted, error } = await supabase
      .from("routine_template_days")
      .insert({
        template_id: templateId,
        name: parsed.data.name,
        day_number: maxDayNumber + 1,
        order_index: maxOrderIndex + 1,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: "No pudimos agregar el día. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const, dayId: inserted.id as string };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function renameTemplateDay(dayId: string, templateId: string, name: string) {
  const parsed = templateDayNameSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: "Ponele un nombre a este día." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    await getTemplateDayContext(supabase, gymId, dayId);

    const { error } = await supabase
      .from("routine_template_days")
      .update({ name: parsed.data.name })
      .eq("id", dayId);

    if (error) {
      return { error: "No pudimos renombrar el día. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteTemplateDay(dayId: string, templateId: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    await getTemplateDayContext(supabase, gymId, dayId);

    await supabase.from("routine_template_exercises").delete().eq("template_day_id", dayId);
    const { error } = await supabase.from("routine_template_days").delete().eq("id", dayId);

    if (error) {
      return { error: "No pudimos eliminar el día. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function addTemplateExerciseToDay(
  templateDayId: string,
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
    const { templateId } = await getTemplateDayContext(supabase, gymId, templateDayId);

    const { data: existing } = await supabase
      .from("routine_template_exercises")
      .select("order_index")
      .eq("template_day_id", templateDayId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = (existing?.[0]?.order_index ?? -1) + 1;

    const { error } = await supabase.from("routine_template_exercises").insert({
      template_day_id: templateDayId,
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

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function updateTemplateExercise(
  exerciseId: string,
  details: RoutineExerciseDetailsValues
) {
  const parsed = routineExerciseDetailsSchema.safeParse(details);

  if (!parsed.success) {
    return { error: "Revisá los datos del ejercicio." };
  }

  const values = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: exercise } = await supabase
      .from("routine_template_exercises")
      .select("template_day_id")
      .eq("id", exerciseId)
      .single();

    if (!exercise) {
      return { error: "No encontramos ese ejercicio." };
    }

    const { templateId } = await getTemplateDayContext(supabase, gymId, exercise.template_day_id);

    const { error } = await supabase
      .from("routine_template_exercises")
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

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteTemplateExercise(exerciseId: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: exercise } = await supabase
      .from("routine_template_exercises")
      .select("template_day_id")
      .eq("id", exerciseId)
      .single();

    if (!exercise) {
      return { error: "No encontramos ese ejercicio." };
    }

    const { templateId } = await getTemplateDayContext(supabase, gymId, exercise.template_day_id);

    const { error } = await supabase
      .from("routine_template_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) {
      return { error: "No pudimos eliminar el ejercicio. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function reorderTemplateExercises(templateDayId: string, orderedIds: string[]) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const { templateId } = await getTemplateDayContext(supabase, gymId, templateDayId);

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("routine_template_exercises")
          .update({ order_index: index })
          .eq("id", id)
          .eq("template_day_id", templateDayId)
      )
    );

    if (results.some((result) => result.error)) {
      return { error: "No pudimos guardar el nuevo orden. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/rutinas/plantillas/${templateId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
