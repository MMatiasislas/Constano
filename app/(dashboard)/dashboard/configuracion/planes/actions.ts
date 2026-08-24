"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { planFormSchema, type PlanFormValues } from "@/lib/validations/plan";

export async function createPlan(values: PlanFormValues) {
  const parsed = planFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase.from("plans").insert({
      gym_id: gymId,
      name: data.name,
      price: Number(data.price),
      duration_days: Number(data.duration_days),
      active: data.active,
    });

    if (error) {
      return { error: "No pudimos crear el plan. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/planes");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function updatePlan(id: string, values: PlanFormValues) {
  const parsed = planFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("plans")
      .update({
        name: data.name,
        price: Number(data.price),
        duration_days: Number(data.duration_days),
        active: data.active,
      })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/planes");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function togglePlan(id: string, active: boolean) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("plans")
      .update({ active })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos actualizar el plan. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/planes");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deletePlan(id: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("gym_id", gymId);

    if (count && count > 0) {
      return {
        error:
          "Este plan ya tiene alumnos asignados en algún momento, así que no se puede eliminar. Desactivalo en vez de eliminarlo para que deje de estar disponible para asignar.",
      };
    }

    const { error } = await supabase.from("plans").delete().eq("id", id).eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos eliminar el plan. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/planes");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
