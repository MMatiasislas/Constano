"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import type { GymSettings } from "@/lib/retention";
import { kioskPinSchema } from "@/lib/validations/kiosk-pin";

export async function setKioskPin(pin: string) {
  const parsed = kioskPinSchema.safeParse({ pin });

  if (!parsed.success) {
    return { error: "El PIN tiene que ser de 4 números." };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: gym, error: fetchError } = await supabase
      .from("gyms")
      .select("settings")
      .eq("id", gymId)
      .single();

    if (fetchError || !gym) {
      return { error: "No pudimos leer la configuración del gimnasio." };
    }

    // Merge, nunca sobreescribir el objeto entero — mismo patrón que
    // updateRetentionMessage (Semana 5 Bloque C), `settings` puede tener
    // otras keys (ej. retention_message) que no hay que pisar.
    const currentSettings = (gym.settings as GymSettings) ?? {};
    const nextSettings: GymSettings = {
      ...currentSettings,
      kiosk_pin: parsed.data.pin,
    };

    const { error } = await supabase
      .from("gyms")
      .update({ settings: nextSettings })
      .eq("id", gymId);

    if (error) {
      return { error: "No pudimos guardar el PIN. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/kiosco");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
