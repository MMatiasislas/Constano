"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

import { createMember } from "./actions";
import { MemberForm, type PhotoChange } from "@/components/alumnos/member-form";
import type { MemberFormValues } from "@/lib/validations/member";

export default function NuevoAlumnoPage() {
  const router = useRouter();

  async function handleSubmit(values: MemberFormValues, photo: PhotoChange) {
    const result = await createMember(values, photo.file);
    if (result?.error) return result;

    if (result?.warning) {
      toast.warning("Alumno creado", { description: result.warning });
    } else {
      toast.success("Alumno creado con éxito");
    }
    router.push("/dashboard/alumnos");
    router.refresh();
  }

  return (
    <div className="flex justify-center">
      <MemberForm
        title="Nuevo alumno"
        description="Cargá los datos básicos para empezar."
        errorTitle="No pudimos crear el alumno"
        cancelHref="/dashboard/alumnos"
        submitLabel="Crear alumno"
        submitLoadingLabel="Creando..."
        initialPhotoUrl={null}
        defaultValues={{
          first_name: "",
          last_name: "",
          phone: "",
          email: "",
          birth_date: "",
          joined_at: format(new Date(), "yyyy-MM-dd"),
          weekly_frequency: "libre",
          notes: "",
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
