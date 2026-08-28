"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { leadSchema, type LeadValues } from "@/lib/validations/lead";

/**
 * Guarda el lead de /comenzar y redirige a /signup con el nombre del
 * gimnasio y el email pre-cargados (vía query params, editables — el
 * visitante puede cambiarlos ahí antes de crear la cuenta).
 *
 * No usa service role: `leads` no tiene RLS (ver
 * supabase/migrations/014_leads.sql), así que el cliente normal (autenticado
 * o no, acá siempre anónimo porque /comenzar es pública) ya puede insertar.
 */
export async function createLead(values: LeadValues) {
  const parsed = leadSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    gym_name: data.gym_name,
    email: data.email,
    phone: data.phone || null,
  });

  if (error) {
    console.error("[createLead] no se pudo guardar el lead", error);
    return { error: "No pudimos guardar tus datos. Intentá de nuevo." };
  }

  const params = new URLSearchParams({ gym_name: data.gym_name, email: data.email });
  // `redirect()` fuera del try/catch a propósito: tira NEXT_REDIRECT, tiene
  // que propagarse sin ser atrapada (mismo patrón que `startCheckout` en
  // dashboard/configuracion/suscripcion/actions.ts).
  redirect(`/signup?${params.toString()}`);
}
