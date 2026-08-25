"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGymLogo as deleteGymLogoFromStorage,
  uploadGymLogo as uploadGymLogoToStorage,
} from "@/lib/storage/gym-logo";

export async function uploadGymLogo(file: File) {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const url = await uploadGymLogoToStorage(file, gymId);

    const { error } = await supabase.from("gyms").update({ logo_url: url }).eq("id", gymId);

    if (error) {
      return { error: "Subimos el logo pero no pudimos guardarlo. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/general");
    return { success: true as const, url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function deleteGymLogo() {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    await deleteGymLogoFromStorage(gymId);

    const { error } = await supabase.from("gyms").update({ logo_url: null }).eq("id", gymId);

    if (error) {
      return { error: "No pudimos actualizar el gimnasio. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/general");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
