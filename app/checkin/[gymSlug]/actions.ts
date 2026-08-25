"use server";

import { createClient } from "@/lib/supabase/server";

// Server Actions PÚBLICAS — sin auth.uid(), corren como el rol `anon` de
// Supabase. No usan getCurrentGymId() a propósito (no hay staff logueado
// en un kiosco ni en el celular de un alumno). Toda la validación real
// (que el token exista, que pertenezca a ESE gym, el constraint de 1
// asistencia por día) vive en las funciones Postgres SECURITY DEFINER de
// supabase/migrations/007_qr_checkin_functions.sql — acá solo se llaman
// vía `.rpc()` y se tipa la respuesta.

export type CheckinScanResult =
  | { status: "invalid" }
  | { status: "success"; memberName: string; checkedInAt: string }
  | { status: "already_checked_in"; memberName: string; checkedInAt: string };

export async function scanQrCheckin(gymSlug: string, token: string): Promise<CheckinScanResult> {
  if (!gymSlug.trim() || !token.trim()) {
    return { status: "invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("checkin_by_qr_token", {
    p_gym_slug: gymSlug,
    p_token: token,
  });

  if (error || !data) {
    return { status: "invalid" };
  }

  const result = data as {
    status: string;
    member_name?: string;
    checked_in_at?: string;
  };

  if (result.status === "success" || result.status === "already_checked_in") {
    return {
      status: result.status,
      memberName: result.member_name ?? "",
      checkedInAt: result.checked_in_at ?? "",
    };
  }

  return { status: "invalid" };
}

// El PIN nunca se lee del lado del cliente: esta acción solo devuelve
// verdadero/falso, la función Postgres es la única que compara el valor.
export async function verifyKioskPinAction(gymSlug: string, pin: string) {
  if (!gymSlug.trim() || !/^\d{4}$/.test(pin)) {
    return { valid: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_kiosk_pin", {
    p_gym_slug: gymSlug,
    p_pin: pin,
  });

  if (error) {
    return { valid: false };
  }

  return { valid: Boolean(data) };
}
