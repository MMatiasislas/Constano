"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { DEFAULT_WHATSAPP_TEMPLATE, type GymSettings } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import { retentionMessageSchema } from "@/lib/validations/retention-message";

export async function updateRetentionMessage(message: string) {
  const parsed = retentionMessageSchema.safeParse({ message });

  if (!parsed.success) {
    return { error: "Revisá el mensaje: no puede estar vacío ni superar los 500 caracteres." };
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

    // Si el texto guardado es igual al default, se guarda `null` en vez del
    // texto literal — así, si el default se actualiza más adelante en el
    // código, este gym lo sigue usando en vez de quedar con una copia
    // congelada del default de hoy.
    const esDefault = parsed.data.message.trim() === DEFAULT_WHATSAPP_TEMPLATE.trim();
    const currentSettings = (gym.settings as GymSettings) ?? {};
    const nextSettings: GymSettings = {
      ...currentSettings,
      retention_message: esDefault ? null : parsed.data.message.trim(),
    };

    const { error } = await supabase
      .from("gyms")
      .update({ settings: nextSettings })
      .eq("id", gymId);

    if (error) {
      return { error: "No pudimos guardar el mensaje. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/mensajes");
    revalidatePath("/dashboard/retencion");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
