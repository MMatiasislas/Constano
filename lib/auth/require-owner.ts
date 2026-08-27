import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const getCurrentUserRole = cache(async (): Promise<"owner" | "staff"> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No hay usuario logueado");
  }

  const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (error || !data) {
    throw new Error(
      "No encontramos tu perfil. Cerrá sesión, iniciá de nuevo y si el problema sigue contactá soporte."
    );
  }

  return data.role as "owner" | "staff";
});

export async function isOwner(): Promise<boolean> {
  try {
    return (await getCurrentUserRole()) === "owner";
  } catch {
    return false;
  }
}

/**
 * Protección REAL (server-side) de una ruta solo para 'owner' — no
 * alcanza con ocultar el link en el sidebar, esto es lo que efectivamente
 * bloquea a un staff que entra directo por URL. Llamar al principio del
 * Server Component de la página protegida:
 * ```ts
 * export default async function NegocioPage() {
 *   await requireOwner();
 *   ...
 * }
 * ```
 * Redirige (no tira error) a `redirectTo`, con `?toast=sin-acceso` para que
 * `<QueryToast />` (montado en el layout del dashboard) muestre el aviso
 * "No tenés acceso a esta sección" apenas aterriza.
 */
export async function requireOwner(redirectTo = "/dashboard/alumnos") {
  const owner = await isOwner();

  if (!owner) {
    const separator = redirectTo.includes("?") ? "&" : "?";
    redirect(`${redirectTo}${separator}toast=sin-acceso`);
  }
}
