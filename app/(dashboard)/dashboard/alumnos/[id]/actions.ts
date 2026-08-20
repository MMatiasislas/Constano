"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";
import type { MemberStatus } from "@/types/db";

export async function updateMemberStatus(id: string, status: MemberStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status }).eq("id", id);

  if (error) {
    return { error: "No pudimos actualizar el estado. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${id}`);
  revalidatePath("/dashboard/alumnos");
  return { success: true as const };
}

export async function updateMember(id: string, values: MemberFormValues) {
  const parsed = memberFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("members")
    .update({
      first_name: data.first_name,
      last_name: data.last_name || null,
      phone: data.phone || null,
      email: data.email || null,
      birth_date: data.birth_date || null,
      joined_at: data.joined_at,
      weekly_frequency:
        data.weekly_frequency === "libre" ? null : Number(data.weekly_frequency),
      notes: data.notes || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${id}`);
  revalidatePath("/dashboard/alumnos");
  return { success: true as const };
}
