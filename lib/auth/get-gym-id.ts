import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export const getCurrentGymId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No hay usuario logueado");
  }

  const { data, error } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error(
      "No encontramos tu perfil de gimnasio. Cerrá sesión, iniciá de nuevo y si el problema sigue contactá soporte."
    );
  }

  return data.gym_id as string;
});
