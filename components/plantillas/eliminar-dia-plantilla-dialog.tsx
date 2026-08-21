"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { deleteTemplateDay } from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { RoutineTemplateDay } from "@/types/db";

export function EliminarDiaPlantillaDialog({
  day,
  templateId,
}: {
  day: RoutineTemplateDay;
  templateId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteTemplateDay(day.id, templateId);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos eliminar el día", { description: result.error });
      return;
    }

    toast.success("Día eliminado");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <Trash2Icon />
        Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar día &quot;{day.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Se van a perder los ejercicios que tenga.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
