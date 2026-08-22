"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  dismissAlertSchema,
  resolveAlertSchema,
  type DismissAlertFormValues,
  type ResolveAlertFormValues,
} from "@/lib/validations/retention-alert";

export async function markAlertContacted(id: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_alerts")
      .update({ status: "contacted" })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos actualizar la alerta. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function resolveAlert(id: string, values: ResolveAlertFormValues) {
  const parsed = resolveAlertSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_reason: parsed.data.resolution_reason,
        notes: parsed.data.notes || null,
      })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos resolver la alerta. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function dismissAlert(id: string, values: DismissAlertFormValues) {
  const parsed = dismissAlertSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_alerts")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
        resolution_reason: null,
        notes: parsed.data.notes || null,
      })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos descartar la alerta. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function reopenAlert(id: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_alerts")
      .update({
        status: "active",
        resolved_at: null,
        resolution_reason: null,
        notes: null,
      })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos reabrir la alerta. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
