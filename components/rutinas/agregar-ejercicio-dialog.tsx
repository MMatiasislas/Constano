"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { addExerciseToDay } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/actions";
import { addTemplateExerciseToDay } from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import { createClient } from "@/lib/supabase/client";
import type { EjercicioEditorContext } from "./editor-ejercicios-dia";
import { cn } from "@/lib/utils";
import { muscleGroupBadgeClass } from "@/lib/exercises";
import {
  routineExerciseDetailsSchema,
  type RoutineExerciseDetailsValues,
} from "@/lib/validations/routine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EjercicioDetallesFields } from "./ejercicio-detalles-fields";
import { MUSCLE_GROUPS, type Exercise } from "@/types/db";

const grupoFiltroOptions = [
  { value: "todos", label: "Todos los grupos" },
  ...MUSCLE_GROUPS.map((grupo) => ({ value: grupo, label: grupo })),
] as const;

const grupoFiltroItems = Object.fromEntries(
  grupoFiltroOptions.map((option) => [option.value, option.label])
);

const emptyDetails: RoutineExerciseDetailsValues = {
  sets: "",
  reps: "",
  weight: "",
  rest_seconds: "",
  notes: "",
};

const addActions = {
  routine: addExerciseToDay,
  template: addTemplateExerciseToDay,
};

export function AgregarEjercicioDialog({
  context,
  dayId,
}: {
  context: EjercicioEditorContext;
  dayId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"buscar" | "detalles">("buscar");
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const hasFetchedRef = useRef(false);
  const [search, setSearch] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState<string>("todos");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<RoutineExerciseDetailsValues>({
    resolver: zodResolver(routineExerciseDetailsSchema),
    defaultValues: emptyDetails,
  });

  useEffect(() => {
    if (!open || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("exercises_library")
      .select("*")
      .order("muscle_group", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setExercises((data ?? []) as Exercise[]);
        setLoadingLibrary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = exercises.filter((exercise) => {
    if (grupoFiltro !== "todos" && exercise.muscle_group !== grupoFiltro) return false;
    if (search.trim() && !exercise.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("buscar");
      setSelected(null);
      setSearch("");
      setGrupoFiltro("todos");
      form.reset(emptyDetails);
    }
  }

  function handleSelect(exercise: Exercise) {
    setSelected(exercise);
    form.reset(emptyDetails);
    setStep("detalles");
  }

  async function handleSubmit(values: RoutineExerciseDetailsValues) {
    if (!selected) return;

    setLoading(true);
    const result = await addActions[context](dayId, {
      name: selected.name,
      muscle_group: selected.muscle_group,
      ...values,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos agregar el ejercicio", { description: result.error });
      return;
    }

    toast.success("Ejercicio agregado");
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <PlusIcon />
        Agregar ejercicio
      </DialogTrigger>
      <DialogContent>
        {step === "buscar" ? (
          <>
            <DialogHeader>
              <DialogTitle>Agregar ejercicio</DialogTitle>
              <DialogDescription>Buscá en la biblioteca del gimnasio.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Buscar en la biblioteca..."
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                items={grupoFiltroItems}
                value={grupoFiltro}
                onValueChange={(value) => value && setGrupoFiltro(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grupoFiltroOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {loadingLibrary ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Cargando ejercicios...
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No encontramos ejercicios con esos filtros.
                  </p>
                ) : (
                  filtered.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => handleSelect(exercise)}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        {exercise.name}
                        {exercise.gym_id && (
                          <Badge variant="outline" className="text-[10px]">
                            Personalizado
                          </Badge>
                        )}
                      </span>
                      {exercise.muscle_group && (
                        <Badge
                          variant="outline"
                          className={cn(muscleGroupBadgeClass(exercise.muscle_group))}
                        >
                          {exercise.muscle_group}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
              <a
                href="/dashboard/ejercicios"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                ¿No encontrás el ejercicio? Agregalo a tu biblioteca
              </a>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          selected && (
            <>
              <DialogHeader>
                <DialogTitle>Agregar ejercicio</DialogTitle>
                <DialogDescription>Cargá series, repeticiones y demás datos.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{selected.name}</span>
                  {selected.muscle_group && (
                    <Badge
                      variant="outline"
                      className={cn(muscleGroupBadgeClass(selected.muscle_group))}
                    >
                      {selected.muscle_group}
                    </Badge>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep("buscar")}>
                  Cambiar
                </Button>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
                  <EjercicioDetallesFields control={form.control} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Agregando..." : "Agregar ejercicio"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
