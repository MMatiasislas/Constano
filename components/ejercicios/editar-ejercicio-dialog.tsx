"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updateExercise } from "@/app/(dashboard)/dashboard/ejercicios/actions";
import { ExerciseForm } from "./ejercicio-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExerciseFormValues } from "@/lib/validations/exercise";
import type { Exercise } from "@/types/db";

export function EditarEjercicioDialog({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ExerciseFormValues) {
    const result = await updateExercise(exercise.id, values);
    if (result?.error) return result;

    toast.success("Cambios guardados");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Editar</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ejercicio</DialogTitle>
          <DialogDescription>Actualizá el nombre o el grupo muscular.</DialogDescription>
        </DialogHeader>
        <ExerciseForm
          defaultValues={{
            name: exercise.name,
            muscle_group: (exercise.muscle_group ?? "ninguno") as ExerciseFormValues["muscle_group"],
          }}
          errorTitle="No pudimos guardar los cambios"
          submitLabel="Guardar cambios"
          submitLoadingLabel="Guardando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
