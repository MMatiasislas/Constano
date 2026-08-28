"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Marca como convertido el lead (si existe) que coincide con el email del
 * usuario recién registrado — se llama desde el cliente, justo después de
 * que `supabase.auth.signUp()` haya devuelto sesión (ver
 * app/(auth)/signup/page.tsx). No recibe ningún dato del caller: el email
 * se lee siempre de la sesión autenticada, no de un parámetro, para que no
 * se pueda marcar como convertido un lead ajeno.
 *
 * Usa el cliente normal (no service role) — `leads` no tiene RLS (ver
 * supabase/migrations/014_leads.sql), así que alcanza con estar
 * autenticado. Si no hay sesión, o el usuario todavía no tiene gym (no
 * debería pasar — el trigger `handle_new_user` lo crea en la misma
 * transacción del INSERT en auth.users), no hace nada — no es un error
 * bloqueante para el flujo de signup.
 *
 * **Caso no cubierto**: si Supabase requiere confirmación de email (no hay
 * `session` inmediata tras el signUp), el gym igual se crea vía el trigger,
 * pero esta función nunca se llama (no hay sesión para autenticar la
 * Server Action) — el lead queda sin convertir aunque el gym ya exista.
 * Quedaría para una vuelta futura intentarlo también en el primer login.
 */
export async function convertLead() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return;

  const { data: profile } = await supabase
    .from("users")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!profile?.gym_id) return;

  const { error } = await supabase
    .from("leads")
    .update({ converted_gym_id: profile.gym_id, converted_at: new Date().toISOString() })
    .eq("email", user.email)
    .is("converted_gym_id", null);

  if (error) {
    // No bloqueante: el signup ya se completó, esto es solo tracking
    // interno de leads.
    console.error("[convertLead] no se pudo marcar el lead como convertido", error);
  }
}
