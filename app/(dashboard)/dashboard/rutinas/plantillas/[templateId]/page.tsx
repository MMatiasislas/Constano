import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon, FileDownIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { parseFechaLocal } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { EditarInfoPlantillaDialog } from "@/components/plantillas/editar-info-plantilla-dialog";
import { AsignarPlantillaDialog } from "@/components/plantillas/asignar-plantilla-dialog";
import { PlantillaDiasTabs } from "@/components/plantillas/plantilla-dias-tabs";
import type { TemplateWithDaysAndExercises } from "@/types/db";

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function PlantillaDetallePage({ params }: PageProps) {
  const { templateId } = await params;
  const supabase = await createClient();

  const { data: templateData } = await supabase
    .from("routine_templates")
    .select("*, routine_template_days(*, routine_template_exercises(*))")
    .eq("id", templateId)
    .order("order_index", { referencedTable: "routine_template_days", ascending: true })
    .order("order_index", {
      referencedTable: "routine_template_days.routine_template_exercises",
      ascending: true,
    })
    .single();

  const template = templateData as TemplateWithDaysAndExercises | null;

  if (!template) {
    notFound();
  }

  const fechaCreacion = format(parseFechaLocal(template.created_at.slice(0, 10)), "dd/MM/yyyy", {
    locale: es,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            href="/dashboard/rutinas/plantillas"
            className="hover:text-foreground hover:underline"
          >
            Plantillas
          </Link>
          <ChevronRightIcon className="size-3.5" />
          <span className="text-foreground">{template.name}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={<Link href="/dashboard/rutinas/plantillas" />}
        >
          <ArrowLeftIcon />
          Volver
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <p className="text-sm text-muted-foreground">Creada el {fechaCreacion}</p>
            {template.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">{template.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EditarInfoPlantillaDialog template={template} />
            <AsignarPlantillaDialog template={template} />
            <span title="Próximamente">
              <Button variant="outline" disabled>
                <FileDownIcon />
                Exportar PDF
              </Button>
            </span>
          </div>
        </div>
      </div>

      <PlantillaDiasTabs templateId={template.id} days={template.routine_template_days} />
    </div>
  );
}
