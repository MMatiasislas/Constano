"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updateExercise } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/actions";
import { updateTemplateExercise } from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import {
  routineExerciseDetailsSchema,
  type RoutineExerciseDetailsValues,
} from "@/lib/validations/routine";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { EjercicioDetallesFields } from "./ejercicio-detalles-fields";
import type { EjercicioComun, EjercicioEditorContext } from "./editor-ejercicios-dia";

const updateActions = {
  routine: updateExercise,
  template: updateTemplateExercise,
};

export function EditarEjercicioDialog({
  context,
  exercise,
}: {
  context: EjercicioEditorContext;
  exercise: EjercicioComun;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultValues: RoutineExerciseDetailsValues = {
    sets: exercise.sets ? String(exercise.sets) : "",
    reps: exercise.reps ?? "",
    weight: exercise.weight !== null ? String(exercise.weight) : "",
    rest_seconds: exercise.rest_seconds !== null ? String(exercise.rest_seconds) : "",
    notes: exercise.notes ?? "",
  };

  const form = useForm<RoutineExerciseDetailsValues>({
    resolver: zodResolver(routineExerciseDetailsSchema),
    defaultValues,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset(defaultValues);
  }

  async function handleSubmit(values: RoutineExerciseDetailsValues) {
    setLoading(true);
    const result = await updateActions[context](exercise.id, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos guardar los cambios", { description: result.error });
      return;
    }

    toast.success("Cambios guardados");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {exercise.name}</DialogTitle>
          <DialogDescription>
            Actualizá series, repeticiones y demás datos. El ejercicio no se puede cambiar acá —
            eliminalo y agregá otro si hace falta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <EjercicioDetallesFields control={form.control} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
