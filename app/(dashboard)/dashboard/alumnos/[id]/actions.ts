"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, randomUUID } from "crypto";
import { format } from "date-fns";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { deleteMemberPhoto, uploadMemberPhoto } from "@/lib/storage/member-photos";
import { calcularFechaVencimiento } from "@/lib/payments";
import { memberFormSchema, type MemberFormValues } from "@/lib/validations/member";
import { assignPlanSchema, type AssignPlanFormValues } from "@/lib/validations/plan";
import { paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import type { MemberStatus } from "@/types/db";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function updateMemberStatus(id: string, status: MemberStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status }).eq("id", id);

  if (error) {
    return { error: "No pudimos actualizar el estado. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${id}`);
  revalidatePath("/dashboard/alumnos");
  return { success: true as const };
}

export async function updateMember(
  id: string,
  values: MemberFormValues,
  photo: { file: File | null; removed: boolean }
) {
  const parsed = memberFormSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("members")
    .select("gym_id, photo_url")
    .eq("id", id)
    .single();

  if (!current) {
    return { error: "No encontramos al alumno." };
  }

  let photoUrl = current.photo_url as string | null;
  let photoWarning: string | undefined;

  if (photo.file) {
    try {
      if (current.photo_url) {
        await deleteMemberPhoto(current.photo_url, current.gym_id, id);
      }
      photoUrl = await uploadMemberPhoto(photo.file, current.gym_id, id);
    } catch (err) {
      photoWarning = err instanceof Error ? err.message : "No pudimos actualizar la foto.";
    }
  } else if (photo.removed && current.photo_url) {
    try {
      await deleteMemberPhoto(current.photo_url, current.gym_id, id);
      photoUrl = null;
    } catch (err) {
      photoWarning = err instanceof Error ? err.message : "No pudimos eliminar la foto.";
    }
  }

  const { error } = await supabase
    .from("members")
    .update({
      first_name: data.first_name,
      last_name: data.last_name || null,
      phone: data.phone || null,
      email: data.email || null,
      birth_date: data.birth_date || null,
      joined_at: data.joined_at,
      weekly_frequency:
        data.weekly_frequency === "libre" ? null : Number(data.weekly_frequency),
      notes: data.notes || null,
      photo_url: photoUrl,
    })
    .eq("id", id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath(`/dashboard/alumnos/${id}`);
  revalidatePath("/dashboard/alumnos");
  return { success: true as const, warning: photoWarning };
}

// Compartida por `assignPlan` (Bloque A) y `registerPaymentAndRenew` (Bloque B, "Cobrar y
// renovar"): un alumno tiene una sola membership activa a la vez, así que renovar siempre expira
// la anterior (si había) antes de crear la nueva.
async function renewMembership(
  supabase: SupabaseServerClient,
  gymId: string,
  memberId: string,
  planId: string,
  startDate: string
): Promise<{ error: string } | { membershipId: string; endDate: string }> {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("duration_days")
    .eq("id", planId)
    .eq("gym_id", gymId)
    .single();

  if (planError || !plan) {
    return { error: "No encontramos el plan elegido. Recargá la página e intentá de nuevo." };
  }

  const { error: expireError } = await supabase
    .from("memberships")
    .update({ status: "expired" })
    .eq("member_id", memberId)
    .eq("gym_id", gymId)
    .eq("status", "active");

  if (expireError) {
    return { error: "No pudimos actualizar el plan anterior. Intentá de nuevo." };
  }

  const endDate = format(calcularFechaVencimiento(startDate, plan.duration_days), "yyyy-MM-dd");

  const { data: membership, error: insertError } = await supabase
    .from("memberships")
    .insert({
      gym_id: gymId,
      member_id: memberId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError || !membership) {
    return { error: "No pudimos asignar el plan. Intentá de nuevo." };
  }

  return { membershipId: membership.id as string, endDate };
}

export async function assignPlan(memberId: string, values: AssignPlanFormValues) {
  const parsed = assignPlanSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const result = await renewMembership(supabase, gymId, memberId, data.plan_id, data.start_date);

    if ("error" in result) {
      return { error: result.error };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function registerPaymentAndRenew(
  memberId: string,
  planId: string,
  values: PaymentFormValues
): Promise<{ error: string } | { success: true; endDate: string }> {
  const parsed = paymentSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const result = await renewMembership(supabase, gymId, memberId, planId, data.paid_at);

    if ("error" in result) {
      return { error: result.error };
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      gym_id: gymId,
      member_id: memberId,
      membership_id: result.membershipId,
      amount: Number(data.amount),
      paid_at: data.paid_at,
      method: data.method,
      notes: data.notes || null,
    });

    if (paymentError) {
      return { error: "El plan se renovó pero no pudimos registrar el pago. Cargalo a mano en el historial." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    revalidatePath("/dashboard/pagos");
    return { success: true as const, endDate: result.endDate };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function registerPaymentOnly(memberId: string, values: PaymentFormValues) {
  const parsed = paymentSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Revisá los datos del formulario." };
  }

  const data = parsed.data;

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data: activeMembership } = await supabase
      .from("memberships")
      .select("id")
      .eq("member_id", memberId)
      .eq("gym_id", gymId)
      .eq("status", "active")
      .maybeSingle();

    const { error } = await supabase.from("payments").insert({
      gym_id: gymId,
      member_id: memberId,
      membership_id: activeMembership?.id ?? null,
      amount: Number(data.amount),
      paid_at: data.paid_at,
      method: data.method,
      notes: data.notes || null,
    });

    if (error) {
      return { error: "No pudimos registrar el pago. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    revalidatePath("/dashboard/pagos");
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

// 48 caracteres hex (un UUID v4 + 8 bytes extra de random), no adivinable.
// Vive acá (no en lib/qr-checkin.ts) porque usa el módulo `crypto` de Node
// — meterlo en un archivo que también importan Client Components rompería
// el bundle de cliente.
function generateQrToken() {
  return `${randomUUID().replace(/-/g, "")}${randomBytes(8).toString("hex")}`;
}

// Misma acción para "Generar QR" (primera vez) y "Regenerar QR": ambas
// simplemente pisan `qr_token` con uno nuevo. El QR anterior queda inválido
// solo porque ya no matchea ninguna fila (el índice único garantiza que
// nunca hay dos alumnos con el mismo token).
export async function generateMemberQrToken(
  memberId: string
): Promise<{ error: string } | { success: true; token: string }> {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const token = generateQrToken();

    const { error } = await supabase
      .from("members")
      .update({ qr_token: token })
      .eq("id", memberId)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos generar el código QR. Intentá de nuevo." };
    }

    revalidatePath(`/dashboard/alumnos/${memberId}`);
    return { success: true as const, token };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
