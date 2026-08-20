import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { muscleGroupBadgeClass } from "@/lib/exercises";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EjerciciosFiltros } from "@/components/ejercicios/ejercicios-filtros";
import { NuevoEjercicioDialog } from "@/components/ejercicios/nuevo-ejercicio-dialog";
import { EditarEjercicioDialog } from "@/components/ejercicios/editar-ejercicio-dialog";
import { BorrarEjercicioDialog } from "@/components/ejercicios/borrar-ejercicio-dialog";
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from "@/types/db";

function escapeForIlike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

type PageProps = {
  searchParams: Promise<{ q?: string; grupo?: string; personalizados?: string }>;
};

export default async function EjerciciosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const grupo = MUSCLE_GROUPS.includes(params.grupo as MuscleGroup)
    ? (params.grupo as MuscleGroup)
    : undefined;
  const soloPersonalizados = params.personalizados === "1";

  const supabase = await createClient();

  let query = supabase
    .from("exercises_library")
    .select("*")
    .order("muscle_group", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (grupo) {
    query = query.eq("muscle_group", grupo);
  }
  if (soloPersonalizados) {
    query = query.not("gym_id", "is", null);
  }
  if (q) {
    query = query.ilike("name", `%${escapeForIlike(q)}%`);
  }

  const [{ data: exercises }, { count: totalCount }, { count: customCount }] = await Promise.all([
    query,
    supabase.from("exercises_library").select("*", { count: "exact", head: true }),
    supabase
      .from("exercises_library")
      .select("*", { count: "exact", head: true })
      .not("gym_id", "is", null),
  ]);

  const lista = (exercises ?? []) as Exercise[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ejercicios</h1>
          <p className="text-muted-foreground">Biblioteca de ejercicios para armar rutinas.</p>
        </div>
        <NuevoEjercicioDialog />
      </div>

      <p className="text-sm text-muted-foreground">
        {totalCount ?? 0} ejercicios disponibles ({customCount ?? 0} personalizados de tu gimnasio)
      </p>

      <EjerciciosFiltros />

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Grupo muscular</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  No encontramos ejercicios con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium text-foreground">
                    {exercise.name}
                    {exercise.gym_id && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Personalizado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {exercise.muscle_group ? (
                      <Badge
                        variant="outline"
                        className={cn(muscleGroupBadgeClass(exercise.muscle_group))}
                      >
                        {exercise.muscle_group}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {exercise.gym_id ? (
                      <div className="flex items-center gap-1">
                        <EditarEjercicioDialog exercise={exercise} />
                        <BorrarEjercicioDialog exercise={exercise} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
