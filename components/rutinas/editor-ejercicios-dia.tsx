"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { deleteExercise, reorderExercises } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/actions";
import {
  deleteTemplateExercise,
  reorderTemplateExercises,
} from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import { cn } from "@/lib/utils";
import { muscleGroupBadgeClass } from "@/lib/exercises";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AgregarEjercicioDialog } from "./agregar-ejercicio-dialog";
import { EditarEjercicioDialog } from "./editar-ejercicio-dialog";

export type EjercicioEditorContext = "routine" | "template";

export type EjercicioComun = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
  order_index: number;
  muscle_group: string | null;
};

const deleteActions = {
  routine: deleteExercise,
  template: deleteTemplateExercise,
};

const reorderActions = {
  routine: reorderExercises,
  template: reorderTemplateExercises,
};

function detalleEjercicio(exercise: EjercicioComun) {
  const seriesReps = [
    exercise.sets ? `${exercise.sets} series` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
  ]
    .filter(Boolean)
    .join(" × ");

  const resto = [
    exercise.weight !== null ? `${exercise.weight}kg` : null,
    exercise.rest_seconds !== null ? `${exercise.rest_seconds}" descanso` : null,
  ].filter(Boolean);

  return [seriesReps || null, ...resto].filter(Boolean).join(" · ");
}

export function EditorEjerciciosDia({
  context,
  dayId,
  ejercicios,
}: {
  context: EjercicioEditorContext;
  dayId: string;
  ejercicios: EjercicioComun[];
}) {
  const router = useRouter();
  const [prevEjercicios, setPrevEjercicios] = useState(ejercicios);
  const [items, setItems] = useState(ejercicios);

  if (ejercicios !== prevEjercicios) {
    setPrevEjercicios(ejercicios);
    setItems(ejercicios);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = items;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    const result = await reorderActions[context](
      dayId,
      reordered.map((item) => item.id)
    );

    if (result?.error) {
      setItems(previous);
      toast.error("No pudimos guardar el nuevo orden", { description: result.error });
    }
  }

  function handleDeleted(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">Este día todavía no tiene ejercicios.</p>
            <AgregarEjercicioDialog context={context} dayId={dayId} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        id={`${context}-day-${dayId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((exercise) => (
              <SortableExerciseCard
                key={exercise.id}
                context={context}
                exercise={exercise}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <AgregarEjercicioDialog context={context} dayId={dayId} />
    </div>
  );
}

function SortableExerciseCard({
  context,
  exercise,
  onDeleted,
}: {
  context: EjercicioEditorContext;
  exercise: EjercicioComun;
  onDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [deleting, setDeleting] = useState(false);
  const detalle = detalleEjercicio(exercise);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteActions[context](exercise.id);
    setDeleting(false);

    if (result?.error) {
      toast.error("No pudimos eliminar el ejercicio", { description: result.error });
      return;
    }

    toast.success("Ejercicio eliminado");
    onDeleted(exercise.id);
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn("py-3", isDragging && "z-10 opacity-70 ring-2 ring-ring")}
    >
      <CardContent className="flex items-start gap-3 py-0">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground outline-none active:cursor-grabbing"
          aria-label={`Reordenar ${exercise.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{exercise.name}</span>
            {exercise.muscle_group && (
              <Badge variant="outline" className={cn(muscleGroupBadgeClass(exercise.muscle_group))}>
                {exercise.muscle_group}
              </Badge>
            )}
          </div>
          {detalle && <span className="text-sm text-muted-foreground">{detalle}</span>}
          {exercise.notes && (
            <span className="text-xs text-muted-foreground italic">{exercise.notes}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditarEjercicioDialog context={context} exercise={exercise} />
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
              <Trash2Icon />
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar &quot;{exercise.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>Se va a quitar de este día.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
