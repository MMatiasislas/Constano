"use server";

import { createElement } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { pdfFileName } from "@/lib/pdf/filename";
import { RoutinePdfDocument, type PdfDay } from "@/components/pdf/routine-pdf-template";
import type { TemplateWithDaysAndExercises } from "@/types/db";

const BUCKET = "gym-assets";

// Misma lógica que generateRoutinePdf (ver ../../../alumnos/[id]/rutinas/[routineId]/pdf-actions.ts),
// pero sin member: `memberName: null` hace que el template renderee "Plantilla"
// en vez de un nombre de alumno.
export async function generateTemplatePdf(
  templateId: string
): Promise<{ url: string } | { error: string }> {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: templateData, error: templateError } = await supabase
      .from("routine_templates")
      .select("*, routine_template_days(*, routine_template_exercises(*))")
      .eq("id", templateId)
      .eq("gym_id", gymId)
      .order("order_index", { referencedTable: "routine_template_days", ascending: true })
      .order("order_index", {
        referencedTable: "routine_template_days.routine_template_exercises",
        ascending: true,
      })
      .single();

    if (templateError || !templateData) {
      return { error: "No encontramos la plantilla." };
    }

    const template = templateData as TemplateWithDaysAndExercises;

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("name, logo_url")
      .eq("id", gymId)
      .single();

    if (gymError || !gym) {
      return { error: "No encontramos los datos del gimnasio." };
    }

    const days: PdfDay[] = template.routine_template_days.map((day) => ({
      name: day.name,
      exercises: day.routine_template_exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        rest_seconds: exercise.rest_seconds,
        notes: exercise.notes,
      })),
    }));

    const { renderToBuffer } = await import("@react-pdf/renderer");

    const buffer = await renderToBuffer(
      createElement(RoutinePdfDocument, {
        gymName: gym.name,
        gymLogoUrl: gym.logo_url,
        memberName: null,
        title: template.name,
        monthLabel: null,
        generatedAtLabel: format(new Date(), "dd/MM/yyyy", { locale: es }),
        days,
      })
    );

    const path = `${gymId}/templates/${template.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { upsert: true, contentType: "application/pdf" });

    if (uploadError) {
      return { error: "No pudimos guardar el PDF. Intentá de nuevo." };
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path, { download: pdfFileName(template.name) });

    return { url: `${publicUrlData.publicUrl}&v=${Date.now()}` };
  } catch {
    return { error: "No pudimos generar el PDF. Intentá de nuevo." };
  }
}
