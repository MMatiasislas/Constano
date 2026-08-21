import Link from "next/link";
import { LayoutTemplateIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { parseFechaLocal } from "@/lib/members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlantillasFiltros } from "@/components/plantillas/plantillas-filtros";
import { NuevaPlantillaDialog } from "@/components/plantillas/nueva-plantilla-dialog";
import { PlantillaAcciones } from "@/components/plantillas/plantilla-acciones";
import { AsignarPlantillaDialog } from "@/components/plantillas/asignar-plantilla-dialog";
import type { TemplateWithCounts } from "@/types/db";

function escapeForIlike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function PlantillasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("routine_templates")
    .select("*, routine_template_days(id, routine_template_exercises(count))")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("name", `%${escapeForIlike(q)}%`);
  }

  const [{ data: templatesData }, { count: totalCount }] = await Promise.all([
    query,
    supabase.from("routine_templates").select("*", { count: "exact", head: true }),
  ]);

  const plantillas = (templatesData ?? []) as TemplateWithCounts[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plantillas de rutinas</h1>
          <p className="text-muted-foreground">
            Armá plantillas reutilizables y asignalas a varios alumnos con un click
          </p>
        </div>
        <NuevaPlantillaDialog />
      </div>

      {(totalCount ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <LayoutTemplateIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Todavía no creaste plantillas</p>
            <p className="text-sm text-muted-foreground">
              Armá una para reutilizarla en muchos alumnos
            </p>
            <NuevaPlantillaDialog triggerLabel="Crear la primera" />
          </CardContent>
        </Card>
      ) : (
        <>
          <PlantillasFiltros />

          {plantillas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                No encontramos plantillas con esos filtros.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plantillas.map((template) => {
                const cantidadDias = template.routine_template_days.length;
                const cantidadEjercicios = template.routine_template_days.reduce(
                  (sum, day) => sum + (day.routine_template_exercises[0]?.count ?? 0),
                  0
                );

                return (
                  <Card key={template.id}>
                    <CardContent className="flex h-full flex-col gap-3 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              parseFechaLocal(template.created_at.slice(0, 10)),
                              "dd/MM/yyyy",
                              { locale: es }
                            )}
                          </span>
                        </div>
                        <PlantillaAcciones template={template} />
                      </div>
                      {template.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {cantidadDias} {cantidadDias === 1 ? "día" : "días"}
                        </Badge>
                        <Badge variant="outline">{cantidadEjercicios} ejercicios totales</Badge>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/dashboard/rutinas/plantillas/${template.id}`} />}
                        >
                          Ver/editar
                        </Button>
                        <AsignarPlantillaDialog template={template} triggerSize="sm" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
