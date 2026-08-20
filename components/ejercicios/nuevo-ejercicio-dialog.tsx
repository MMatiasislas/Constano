"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { createExercise } from "@/app/(dashboard)/dashboard/ejercicios/actions";
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

export function NuevoEjercicioDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ExerciseFormValues) {
    const result = await createExercise(values);
    if (result?.error) return result;

    toast.success("Ejercicio creado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Nuevo ejercicio
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo ejercicio</DialogTitle>
          <DialogDescription>Se suma a la biblioteca de tu gimnasio.</DialogDescription>
        </DialogHeader>
        <ExerciseForm
          defaultValues={{ name: "", muscle_group: "ninguno" }}
          errorTitle="No pudimos crear el ejercicio"
          submitLabel="Crear ejercicio"
          submitLoadingLabel="Creando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
