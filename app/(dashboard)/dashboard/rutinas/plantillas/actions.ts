"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  assignTemplateFormSchema,
  assignTemplateSchema,
  duplicateTemplateSchema,
  templateSchema,
  type AssignTemplateFormValues,
  type TemplateFormValues,
} from "@/lib/validations/routine-template";
import type { RoutineTemplateDay, RoutineTemplateExercise } from "@/types/db";

export async function createTemplate(values: TemplateFormValues) {
  const parsed = templateSchema.safeParse(values);

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

    const { data: template, error } = await supabase
      .from("routine_templates")
      .insert({
        gym_id: gymId,
        name: data.name,
        description: data.description || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !template) {
      return { error: "No pudimos crear la plantilla. Intentá de nuevo." };
    }

    const daysToInsert = data.days.map((day, index) => ({
      template_id: template.id,
      day_number: index + 1,
      order_index: index,
      name: day.name,
    }));

    const { error: daysError } = await supabase
      .from("routine_template_days")
      .insert(daysToInsert);

    if (daysError) {
      await supabase.from("routine_templates").delete().eq("id", template.id);
      return { error: "No pudimos crear los días de la plantilla. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/rutinas/plantillas");
    return { success: true as const, templateId: template.id as string };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteTemplate(templateId: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: days } = await supabase
      .from("routine_template_days")
      .select("id")
      .eq("template_id", templateId);
    const dayIds = (days ?? []).map((day) => day.id);

    if (dayIds.length > 0) {
      await supabase.from("routine_template_exercises").delete().in("template_day_id", dayIds);
    }
    await supabase.from("routine_template_days").delete().eq("template_id", templateId);

    const { error } = await supabase
      .from("routine_templates")
      .delete()
      .eq("id", templateId)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos eliminar la plantilla. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/rutinas/plantillas");
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function duplicateTemplate(templateId: string, name: string) {
  const parsed = duplicateTemplateSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: "Ponele un nombre a la plantilla." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: original } = await supabase
      .from("routine_templates")
      .select("*, routine_template_days(*, routine_template_exercises(*))")
      .eq("id", templateId)
      .eq("gym_id", gymId)
      .single();

    if (!original) {
      return { error: "No encontramos esa plantilla." };
    }

    const { data: newTemplate, error } = await supabase
      .from("routine_templates")
      .insert({
        gym_id: gymId,
        name: parsed.data.name,
        description: original.description,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !newTemplate) {
      return { error: "No pudimos duplicar la plantilla. Intentá de nuevo." };
    }

    const days = (
      (original.routine_template_days ?? []) as (RoutineTemplateDay & {
        routine_template_exercises: RoutineTemplateExercise[];
      })[]
    ).sort((a, b) => a.order_index - b.order_index);

    for (const day of days) {
      const { data: newDay, error: dayError } = await supabase
        .from("routine_template_days")
        .insert({
          template_id: newTemplate.id,
          day_number: day.day_number,
          order_index: day.order_index,
          name: day.name,
        })
        .select("id")
        .single();

      if (dayError || !newDay) {
        await supabase.from("routine_templates").delete().eq("id", newTemplate.id);
        return { error: "No pudimos duplicar los días de la plantilla. Intentá de nuevo." };
      }

      const exercises = [...(day.routine_template_exercises ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      );

      if (exercises.length > 0) {
        const { error: exercisesError } = await supabase.from("routine_template_exercises").insert(
          exercises.map((exercise) => ({
            template_day_id: newDay.id,
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
          await supabase.from("routine_templates").delete().eq("id", newTemplate.id);
          return { error: "No pudimos duplicar los ejercicios de la plantilla. Intentá de nuevo." };
        }
      }
    }

    revalidatePath("/dashboard/rutinas/plantillas");
    return { success: true as const, templateId: newTemplate.id as string };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function assignTemplateToMembers(
  templateId: string,
  memberIds: string[],
  values: AssignTemplateFormValues
) {
  const idsParsed = assignTemplateSchema.safeParse({ templateId, memberIds });

  if (!idsParsed.success) {
    return { error: "Elegí al menos un alumno." };
  }

  const valuesParsed = assignTemplateFormSchema.safeParse(values);

  if (!valuesParsed.success) {
    return { error: "Revisá el título de la rutina." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: template } = await supabase
      .from("routine_templates")
      .select("*, routine_template_days(*, routine_template_exercises(*))")
      .eq("id", templateId)
      .eq("gym_id", gymId)
      .single();

    if (!template) {
      return { error: "No encontramos esa plantilla." };
    }

    const { data: members } = await supabase
      .from("members")
      .select("id")
      .eq("gym_id", gymId)
      .in("id", idsParsed.data.memberIds);

    const validMemberIds = (members ?? []).map((member) => member.id as string);

    if (validMemberIds.length === 0) {
      return { error: "No encontramos alumnos válidos para asignar." };
    }

    const days = (
      (template.routine_template_days ?? []) as (RoutineTemplateDay & {
        routine_template_exercises: RoutineTemplateExercise[];
      })[]
    ).sort((a, b) => a.order_index - b.order_index);

    const monthNumber =
      valuesParsed.data.month_number === "ninguno" ? null : Number(valuesParsed.data.month_number);

    let createdCount = 0;

    for (const memberId of validMemberIds) {
      const { data: routine, error: routineError } = await supabase
        .from("routines")
        .insert({
          gym_id: gymId,
          member_id: memberId,
          title: valuesParsed.data.title,
          month_number: monthNumber,
          notes: template.description,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();

      if (routineError || !routine) continue;

      for (const day of days) {
        const { data: newDay, error: dayError } = await supabase
          .from("routine_days")
          .insert({
            routine_id: routine.id,
            day_number: day.day_number,
            order_index: day.order_index,
            name: day.name,
          })
          .select("id")
          .single();

        if (dayError || !newDay) continue;

        const exercises = [...(day.routine_template_exercises ?? [])].sort(
          (a, b) => a.order_index - b.order_index
        );

        if (exercises.length > 0) {
          await supabase.from("routine_exercises").insert(
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
        }
      }

      createdCount++;
    }

    if (createdCount === 0) {
      return { error: "No pudimos asignar la plantilla a ningún alumno. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/rutinas/plantillas");
    return { success: true as const, count: createdCount };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
