"use server";

import { revalidatePath } from "next/cache";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { memberImportRowSchema, type MemberImportData } from "@/lib/validations/member-import";
import type { Member } from "@/types/db";

export type ExistingMemberForImport = Pick<Member, "id" | "first_name" | "last_name" | "phone">;

// Lista liviana de TODOS los alumnos del gym (sin paginar, sin filtrar por
// estado) para chequear duplicados en el paso 3 del wizard — el listado
// paginado de /dashboard/alumnos no sirve para esto porque solo trae la
// página actual y puede excluir pausados/inactivos según el filtro.
export async function getExistingMembersForImport(): Promise<{
  members: ExistingMemberForImport[];
  error?: string;
}> {
  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, phone")
      .eq("gym_id", gymId);

    if (error) {
      return { members: [], error: "No pudimos cargar los alumnos existentes." };
    }

    return { members: (data ?? []) as ExistingMemberForImport[] };
  } catch (err) {
    return {
      members: [],
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}

export type ImportRow = {
  action: "create" | "update";
  data: MemberImportData;
  existingId?: string;
};

export async function importMembers(
  rows: ImportRow[]
): Promise<{ created: number; updated: number; error?: string }> {
  if (rows.length === 0) {
    return { created: 0, updated: 0 };
  }

  try {
    const gymId = await getCurrentGymId();
    const supabase = await createClient();

    const toCreate: Record<string, unknown>[] = [];
    // Map por `existingId`, no array: si dos filas del Excel matchean al
    // mismo alumno existente (ej. mismo teléfono en dos filas), un upsert
    // con la misma PK repetida dos veces en el mismo array falla en
    // Postgres ("ON CONFLICT DO UPDATE command cannot affect row a second
    // time"). Con el Map, la última fila gana y se pisa una sola vez.
    const toUpdateById = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      // Segunda validación del lado del servidor — el cliente ya filtró
      // filas con error antes de llegar acá, esto es defensa extra, nunca
      // se debería confiar en los datos tal cual vienen del browser.
      const parsed = memberImportRowSchema.safeParse(row.data);
      if (!parsed.success) continue;

      const data = parsed.data;
      const payload = {
        gym_id: gymId,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        birth_date: data.birth_date,
        joined_at: data.joined_at,
        weekly_frequency: data.weekly_frequency,
        notes: data.notes,
      };

      if (row.action === "update" && row.existingId) {
        toUpdateById.set(row.existingId, { id: row.existingId, ...payload });
      } else {
        toCreate.push({ ...payload, status: "active" });
      }
    }

    const toUpdate = Array.from(toUpdateById.values());

    let created = 0;
    let updated = 0;

    if (toCreate.length > 0) {
      const { data: inserted, error } = await supabase
        .from("members")
        .insert(toCreate)
        .select("id");

      if (error) {
        return { created: 0, updated: 0, error: "No pudimos crear los alumnos nuevos. Intentá de nuevo." };
      }
      created = inserted?.length ?? 0;
    }

    if (toUpdate.length > 0) {
      // Un solo upsert por PK (`id`) en vez de N updates — RLS ya garantiza
      // que un `id` de otro gym no se puede pisar (la fila queda invisible
      // bajo `using`, y el upsert intentaría un insert con esa PK ya
      // ocupada, que falla por conflicto de clave — nunca sobreescribe
      // datos de otro tenant). Mismo criterio de confiar en RLS que
      // `updateMemberStatus` en alumnos/[id]/actions.ts.
      const { data: upserted, error } = await supabase
        .from("members")
        .upsert(toUpdate, { onConflict: "id" })
        .select("id");

      if (error) {
        return {
          created,
          updated: 0,
          error:
            created > 0
              ? `Se crearon ${created} alumnos nuevos, pero no pudimos actualizar los duplicados marcados.`
              : "No pudimos actualizar los alumnos duplicados. Intentá de nuevo.",
        };
      }
      updated = upserted?.length ?? 0;
    }

    revalidatePath("/dashboard/alumnos");
    return { created, updated };
  } catch (err) {
    return {
      created: 0,
      updated: 0,
      error: err instanceof Error ? err.message : "No hay una sesión activa. Iniciá sesión de nuevo.",
    };
  }
}
