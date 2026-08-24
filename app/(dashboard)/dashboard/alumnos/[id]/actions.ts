"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { deleteMemberPhoto, uploadMemberPhoto } from "@/lib/storage/member-photos";
import { calcularFechaVencimiento } from "@/lib/payments";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";
import { assignPlanSchema, type AssignPlanFormValues } from "@/lib/validations/plan";
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

export async function updateMember(
  id: string,
  values: MemberFormValues,
  photo: { file: File | null; removed: boolean }
) {
  const parsed = memberFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("members")
    .select("gym_id, photo_url")
    .eq("id", id)
    .single();

  if (!current) {
    return { error: "No encontramos al alumno." };
  }

  let photoUrl = current.photo_url as string | null;
  let photoWarning: string | undefined;

  if (photo.file) {
    try {
      if (current.photo_url) {
        await deleteMemberPhoto(current.photo_url, current.gym_id, id);
      }
      photoUrl = await uploadMemberPhoto(photo.file, current.gym_id, id);
    } catch (err) {
      photoWarning = err instanceof Error ? err.message : "No pudimos actualizar la foto.";
    }
  } else if (photo.removed && current.photo_url) {
    try {
      await deleteMemberPhoto(current.photo_url, current.gym_id, id);
      photoUrl = null;
    } catch (err) {
      photoWarning = err instanceof Error ? err.message : "No pudimos eliminar la foto.";
    }
  }

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
      photo_url: photoUrl,
    })
    .eq("id", id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${id}`);
  revalidatePath("/dashboard/alumnos");
  return { success: true as const, warning: photoWarning };
}

export async function assignPlan(memberId: string, values: AssignPlanFormValues) {
  const parsed = assignPlanSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("duration_days")
      .eq("id", data.plan_id)
      .eq("gym_id", gymId)
      .single();

    if (planError || !plan) {
      return { error: "No encontramos el plan elegido. Recargá la página e intentá de nuevo." };
    }

    // Un alumno tiene una sola membership activa a la vez: la anterior (si
    // había) se expira acá antes de crear la nueva.
    const { error: expireError } = await supabase
      .from("memberships")
      .update({ status: "expired" })
      .eq("member_id", memberId)
      .eq("gym_id", gymId)
      .eq("status", "active");

    if (expireError) {
      return { error: "No pudimos actualizar el plan anterior. Intentá de nuevo." };
    }

    const endDate = format(
      calcularFechaVencimiento(data.start_date, plan.duration_days),
      "yyyy-MM-dd"
    );

    const { error: insertError } = await supabase.from("memberships").insert({
      gym_id: gymId,
      member_id: memberId,
      plan_id: data.plan_id,
      start_date: data.start_date,
      end_date: endDate,
      status: "active",
    });

    if (insertError) {
      return { error: "No pudimos asignar el plan. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
