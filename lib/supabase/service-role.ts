import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la `service_role` key de Supabase — se salta RLS por
 * completo. Usar SOLO en contextos sin usuario autenticado (los webhooks de
 * Mercado Pago/Stripe, que los llama el proveedor de pago, no el browser) o
 * para escrituras de sistema que no deben depender de si quien está
 * logueado es 'owner' o no (ver el UPDATE de `grace_period_ends_at` en
 * `lib/subscription.ts`).
 *
 * NUNCA importar esto en un Client Component, ni loguear/exponer la key —
 * `SUPABASE_SERVICE_ROLE_KEY` (sin prefijo `NEXT_PUBLIC_`) da acceso total a
 * la base saltándose todas las policies.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
