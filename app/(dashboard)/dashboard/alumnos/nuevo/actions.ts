"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";

export async function createMember(values: MemberFormValues) {
  const parsed = memberFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase.from("members").insert({
      gym_id: gymId,
      first_name: data.first_name,
      last_name: data.last_name || null,
      phone: data.phone || null,
      email: data.email || null,
      birth_date: data.birth_date || null,
      joined_at: data.joined_at,
      weekly_frequency:
        data.weekly_frequency === "libre" ? null : Number(data.weekly_frequency),
      notes: data.notes || null,
      status: "active",
    });

    if (error) {
      return { error: "No pudimos crear el alumno. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/alumnos");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
