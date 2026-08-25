"use server";

import { createElement } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { nombreCompleto } from "@/lib/members";
import { monthLabel } from "@/lib/routines";
import { pdfFileName } from "@/lib/pdf/filename";
import { RoutinePdfDocument, type PdfDay } from "@/components/pdf/routine-pdf-template";
import type { Routine, RoutineDayWithExercises } from "@/types/db";

const BUCKET = "gym-assets";

type RoutineForPdf = Routine & {
  routine_days: RoutineDayWithExercises[];
  members: { first_name: string; last_name: string | null } | null;
};

// Siempre regenera y sobreescribe (mismo path, upsert:true) para que el PDF
// quede al día con la última edición de la rutina — no se cachea nada acá,
// se llama de nuevo cada vez que el usuario aprieta "Exportar PDF".
export async function generateRoutinePdf(
  routineId: string
): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createClient();

    const { data: routineData, error: routineError } = await supabase
      .from("routines")
      .select("*, routine_days(*, routine_exercises(*)), members(first_name, last_name)")
      .eq("id", routineId)
      .order("order_index", { referencedTable: "routine_days", ascending: true })
      .order("order_index", {
        referencedTable: "routine_days.routine_exercises",
        ascending: true,
      })
      .single();

    if (routineError || !routineData) {
      return { error: "No encontramos la rutina." };
    }

    const routine = routineData as RoutineForPdf;

    const { data: gym, error: gymError } = await supabase
      .from("gyms")
      .select("name, logo_url")
      .eq("id", routine.gym_id)
      .single();

    if (gymError || !gym) {
      return { error: "No encontramos los datos del gimnasio." };
    }

    const days: PdfDay[] = routine.routine_days.map((day) => ({
      name: day.name,
      exercises: day.routine_exercises.map((exercise) => ({
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
        memberName: routine.members
          ? nombreCompleto(routine.members.first_name, routine.members.last_name)
          : null,
        title: routine.title,
        monthLabel: monthLabel(routine.month_number),
        generatedAtLabel: format(new Date(), "dd/MM/yyyy", { locale: es }),
        days,
      })
    );

    const path = `${routine.gym_id}/routines/${routine.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { upsert: true, contentType: "application/pdf" });

    if (uploadError) {
      return { error: "No pudimos guardar el PDF. Intentá de nuevo." };
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path, { download: pdfFileName(routine.title) });

    // Cache-bust: el path es siempre el mismo (upsert), así que sin esto el
    // browser puede seguir sirviendo/mostrando el PDF viejo cacheado.
    return { url: `${publicUrlData.publicUrl}&v=${Date.now()}` };
  } catch {
    return { error: "No pudimos generar el PDF. Intentá de nuevo." };
  }
}
