"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateMember } from "../actions";
import { MemberForm, type PhotoChange } from "@/components/alumnos/member-form";
import { nombreCompleto } from "@/lib/members";
import type { MemberFormValues } from "@/lib/validations/member";
import type { Member } from "@/types/db";

export function EditarAlumnoForm({ member }: { member: Member }) {
  const router = useRouter();

  async function handleSubmit(values: MemberFormValues, photo: PhotoChange) {
    const result = await updateMember(member.id, values, photo);
    if (result?.error) return result;

    if (result?.warning) {
      toast.warning("Cambios guardados", { description: result.warning });
    } else {
      toast.success("Cambios guardados");
    }
    router.push(`/dashboard/alumnos/${member.id}`);
    router.refresh();
  }

  return (
    <div className="flex justify-center">
      <MemberForm
        title={`Editar a ${nombreCompleto(member.first_name, member.last_name)}`}
        description="Actualizá los datos del alumno."
        errorTitle="No pudimos guardar los cambios"
        cancelHref={`/dashboard/alumnos/${member.id}`}
        submitLabel="Guardar cambios"
        submitLoadingLabel="Guardando..."
        initialPhotoUrl={member.photo_url}
        defaultValues={{
          first_name: member.first_name,
          last_name: member.last_name ?? "",
          phone: member.phone ?? "",
          email: member.email ?? "",
          birth_date: member.birth_date ?? "",
          joined_at: member.joined_at,
          weekly_frequency: member.weekly_frequency
            ? (String(member.weekly_frequency) as MemberFormValues["weekly_frequency"])
            : "libre",
          notes: member.notes ?? "",
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
