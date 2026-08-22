"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { frequencyOptionToDbValue } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import { retentionRuleSchema, type RetentionRuleFormValues } from "@/lib/validations/retention-rule";

export async function createRetentionRule(values: RetentionRuleFormValues) {
  const parsed = retentionRuleSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase.from("retention_rules").insert({
      gym_id: gymId,
      name: data.name,
      days_without_attendance: Number(data.days_without_attendance),
      applies_to_frequency: frequencyOptionToDbValue(data.applies_to_frequency),
      active: data.active,
    });

    if (error) {
      return { error: "No pudimos crear la regla. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function updateRetentionRule(id: string, values: RetentionRuleFormValues) {
  const parsed = retentionRuleSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_rules")
      .update({
        name: data.name,
        days_without_attendance: Number(data.days_without_attendance),
        applies_to_frequency: frequencyOptionToDbValue(data.applies_to_frequency),
        active: data.active,
      })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function toggleRetentionRule(id: string, active: boolean) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_rules")
      .update({ active })
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos actualizar la regla. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteRetentionRule(id: string) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("retention_rules")
      .delete()
      .eq("id", id)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos eliminar la regla. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
