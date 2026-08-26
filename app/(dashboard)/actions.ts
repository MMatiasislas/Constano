"use server";

import { createClient } from "@/lib/supabase/server";

export async function markOnboardingSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No hay una sesión activa. Iniciá sesión de nuevo." };
  }

  const { error } = await supabase
    .from("users")
    .update({ onboarding_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: "No pudimos guardar tu progreso. Intentá de nuevo." };
  }

  return { success: true as const };
}
