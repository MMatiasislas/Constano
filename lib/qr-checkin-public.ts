import { createClient } from "@/lib/supabase/server";

// Lookups públicos de solo lectura para las páginas de /checkin/{gymSlug}/...
// — llamados directo desde Server Components (mismo patrón que
// lib/retention-alerts-engine.ts, sin "use server": no son mutaciones que
// un Client Component necesite invocar, así que no hace falta la
// envoltura de Server Action). Cada uno delega en una función Postgres
// SECURITY DEFINER (ver supabase/migrations/007_qr_checkin_functions.sql)
// porque el cliente de Supabase acá corre como `anon` (sin sesión de
// staff) y las policies de RLS son todas `to authenticated` — sin esas
// funciones, un `select` normal a `gyms`/`members` no devuelve filas.

export type GymPublicInfo = { id: string; name: string; has_kiosk_pin: boolean };

export async function getGymPublicInfo(gymSlug: string): Promise<GymPublicInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_gym_public_info", { p_gym_slug: gymSlug })
    .maybeSingle();

  if (error) console.error("getGymPublicInfo error:", error);
  if (error || !data) return null;
  return data as GymPublicInfo;
}

export type MemberQrInfo = { first_name: string; last_name: string | null };

export async function getMemberQrInfo(
  gymSlug: string,
  token: string
): Promise<MemberQrInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_member_qr_info", { p_gym_slug: gymSlug, p_token: token })
    .maybeSingle();

  if (error) console.error("getMemberQrInfo error:", error);
  if (error || !data) return null;
  return data as MemberQrInfo;
}
