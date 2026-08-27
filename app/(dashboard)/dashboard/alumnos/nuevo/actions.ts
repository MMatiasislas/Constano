"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";
import { createClient } from "@/lib/supabase/server";
import { uploadMemberPhoto } from "@/lib/storage/member-photos";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";

export async function createMember(values: MemberFormValues, photoFile: File | null) {
  const parsed = memberFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    await requireActiveSubscription();
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: inserted, error } = await supabase
      .from("members")
      .insert({
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
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: "No pudimos crear el alumno. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/alumnos");

    if (!photoFile) {
      return { success: true as const };
    }

    try {
      const photoUrl = await uploadMemberPhoto(photoFile, gymId, inserted.id);
      await supabase.from("members").update({ photo_url: photoUrl }).eq("id", inserted.id);
      revalidatePath(`/dashboard/alumnos/${inserted.id}`);
      return { success: true as const };
    } catch (photoError) {
      // El alumno ya quedó creado; la foto se puede volver a intentar desde Editar.
      return {
        success: true as const,
        warning:
          photoError instanceof Error
            ? photoError.message
            : "No pudimos subir la foto. Podés cargarla después desde Editar.",
      };
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
