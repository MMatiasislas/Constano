"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { isOwner } from "@/lib/auth/require-owner";
import { createClient } from "@/lib/supabase/server";
import { inviteTeamMemberSchema, type InviteTeamMemberValues } from "@/lib/validations/team";

export async function inviteTeamMember(values: InviteTeamMemberValues) {
  const parsed = inviteTeamMemberSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Ingresá un email válido." };
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    if (!(await isOwner())) {
      return { error: "Solo el dueño del gimnasio puede invitar miembros del equipo." };
    }

    const gymId = await getCurrentGymId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: existingMember } = await supabase
      .from("users")
      .select("id")
      .eq("gym_id", gymId)
      .ilike("email", email)
      .maybeSingle();

    if (existingMember) {
      return { error: "Ya es parte de tu equipo." };
    }

    const { data: existingInvitation } = await supabase
      .from("team_invitations")
      .select("token, expires_at")
      .eq("gym_id", gymId)
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      // Ya había una invitación vigente para este email — se reusa en vez
      // de crear otra duplicada.
      return { success: true as const, token: existingInvitation.token };
    }

    const token = randomUUID();

    const { error } = await supabase.from("team_invitations").insert({
      gym_id: gymId,
      email,
      token,
      invited_by: user?.id ?? null,
    });

    if (error) {
      return { error: "No pudimos crear la invitación. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/equipo");
    // Devuelve el token, no la URL completa: el cliente arma el link con
    // `window.location.origin` (el dominio real desde el que se está
    // navegando) en vez de depender de NEXT_PUBLIC_SITE_URL — esa variable
    // puede estar apuntando a un dominio de prueba en dev (ver
    // lib/payments/mercadopago.ts, la necesita para el back_url de MP) que
    // no coincide con localhost.
    return { success: true as const, token };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export async function cancelInvitation(invitationId: string) {
  try {
    if (!(await isOwner())) {
      return { error: "Solo el dueño del gimnasio puede cancelar invitaciones." };
    }

    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("team_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("gym_id", gymId);

    if (error) {
      return { error: "No pudimos cancelar la invitación. Intentá de nuevo." };
    }

    revalidatePath("/dashboard/configuracion/equipo");
    return { success: true as const };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

// TODO: eliminar un miembro del equipo requiere borrar (o al menos
// desactivar) su fila en auth.users, que necesita la service_role key
// (lib/supabase/service-role.ts) — no alcanza con borrar de public.users,
// el usuario seguiría pudiendo loguearse con esa cuenta. Se dejó el botón
// deshabilitado en la UI (components/equipo/miembros-table.tsx) hasta
// implementarlo con cuidado (¿soft-delete? ¿desactivar en vez de borrar?
// definirlo con Matías antes de tocar auth.users).
