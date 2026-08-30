import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { nombreCompleto, parseFechaLocal } from "@/lib/members";
import { monthLabel } from "@/lib/routines";
import { Button } from "@/components/ui/button";
import { EditarInfoRutinaDialog } from "@/components/rutinas/editar-info-rutina-dialog";
import { RutinaDiasTabs } from "@/components/rutinas/rutina-dias-tabs";
import { ExportarPdfButton } from "@/components/pdf/exportar-pdf-button";
import { generateRoutinePdf } from "./pdf-actions";
import type { Routine, RoutineDayWithExercises } from "@/types/db";

type RoutineDetail = Routine & {
  routine_days: RoutineDayWithExercises[];
  members: { first_name: string; last_name: string | null; phone: string | null } | null;
};

type PageProps = {
  params: Promise<{ id: string; routineId: string }>;
};

export default async function RutinaDetallePage({ params }: PageProps) {
  const { id, routineId } = await params;
  const supabase = await createClient();

  const { data: routineData } = await supabase
    .from("routines")
    .select("*, routine_days(*, routine_exercises(*)), members(first_name, last_name, phone)")
    .eq("id", routineId)
    .order("order_index", { referencedTable: "routine_days", ascending: true })
    .order("order_index", { referencedTable: "routine_days.routine_exercises", ascending: true })
    .single();

  const routine = routineData as RoutineDetail | null;

  if (!routine || routine.member_id !== id) {
    notFound();
  }

  const nombreAlumno = routine.members
    ? nombreCompleto(routine.members.first_name, routine.members.last_name)
    : "Alumno";
  const mes = monthLabel(routine.month_number);
  const fechaCreacion = format(parseFechaLocal(routine.created_at.slice(0, 10)), "dd/MM/yyyy", {
    locale: es,
  });

  // Server Action inline: captura routine.id por closure. Next permite este
  // patrón (función definida en un Server Component con su propio "use
  // server") para pasarla como prop a un Client Component sin tener que
  // pasarle el id aparte y que el cliente arme la llamada.
  async function generatePdf() {
    "use server";
    return generateRoutinePdf(routine!.id);
  }

  const memberPhone = routine.members?.phone ?? null;
  const whatsapp = memberPhone
    ? {
        phone: memberPhone,
        messagePrefix: `Hola ${nombreAlumno}! Acá está tu rutina "${routine.title}": `,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/dashboard/alumnos" className="hover:text-foreground hover:underline">
            Alumnos
          </Link>
          <ChevronRightIcon className="size-3.5" />
          <Link href={`/dashboard/alumnos/${id}`} className="hover:text-foreground hover:underline">
            {nombreAlumno}
          </Link>
          <ChevronRightIcon className="size-3.5" />
          <span className="text-foreground">{routine.title}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={<Link href={`/dashboard/alumnos/${id}`} />}
        >
          <ArrowLeftIcon />
          Volver
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-medium tracking-tight">{routine.title}</h1>
            <p className="text-sm text-muted-foreground">
              {[`Creada el ${fechaCreacion}`, mes].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EditarInfoRutinaDialog routine={routine} memberId={id} />
            <ExportarPdfButton
              generatePdf={generatePdf}
              whatsapp={whatsapp}
              whatsappDisabledReason={
                whatsapp ? undefined : "Este alumno no tiene teléfono cargado."
              }
            />
          </div>
        </div>
      </div>

      <RutinaDiasTabs routineId={routine.id} memberId={id} days={routine.routine_days} />
    </div>
  );
}
