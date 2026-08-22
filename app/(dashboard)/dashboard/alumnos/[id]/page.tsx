import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleIcon, PencilIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  ESTADO_BADGE,
  frecuenciaLabel,
  getInitials,
  nombreCompleto,
  parseFechaLocal,
  whatsappHref,
} from "@/lib/members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlumnoAcciones } from "@/components/alumnos/alumno-acciones";
import { NuevaRutinaDialog } from "@/components/rutinas/nueva-rutina-dialog";
import { RutinaAcciones } from "@/components/rutinas/rutina-acciones";
import { DuplicarRutinaDialog } from "@/components/rutinas/duplicar-rutina-dialog";
import { AlumnoAsistenciaTab } from "@/components/asistencia/alumno-asistencia-tab";
import type { AttendanceWithCheckedBy, Member, RoutineWithDayCount } from "@/types/db";

function calcularEdad(birthDate: string | null) {
  if (!birthDate) return null;

  const hoy = new Date();
  const nacimiento = parseFechaLocal(birthDate);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AlumnoDetallePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: member }, { data: routinesData }, { data: attendancesData }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).single(),
    supabase
      .from("routines")
      .select("*, routine_days(count)")
      .eq("member_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attendances")
      .select("*, checked_in_by_user:users(email)")
      .eq("member_id", id)
      .order("checked_in_at", { ascending: false })
      .limit(60),
  ]);

  if (!member) {
    notFound();
  }

  const routinas = (routinesData ?? []) as RoutineWithDayCount[];
  const attendances = (attendancesData ?? []) as AttendanceWithCheckedBy[];

  const alumno = member as Member;
  const nombre = nombreCompleto(alumno.first_name, alumno.last_name);
  const badge = ESTADO_BADGE[alumno.status];
  const edad = calcularEdad(alumno.birth_date);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="!size-16">
            {alumno.photo_url && <AvatarImage src={alumno.photo_url} alt={nombre} />}
            <AvatarFallback className="text-lg">
              {getInitials(alumno.first_name, alumno.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{nombre}</h1>
              <Badge variant="outline" className={cn(badge.className)}>
                {badge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {[edad !== null ? `${edad} años` : null, frecuenciaLabel(alumno.weekly_frequency)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {alumno.phone && (
              <div className="flex items-center gap-3">
                <a href={`tel:${alumno.phone}`} className="text-sm text-foreground hover:underline">
                  {alumno.phone}
                </a>
                <a
                  href={whatsappHref(alumno.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  <MessageCircleIcon className="size-4" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/dashboard/alumnos/${alumno.id}/editar`} />}
          >
            <PencilIcon />
            Editar
          </Button>
          <AlumnoAcciones member={alumno} />
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card>
            <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
              <InfoField label="Nombre completo" value={nombre} />
              <InfoField
                label="Fecha de nacimiento"
                value={
                  alumno.birth_date
                    ? format(parseFechaLocal(alumno.birth_date), "dd/MM/yyyy", { locale: es })
                    : "No cargada"
                }
              />
              <InfoField label="Teléfono" value={alumno.phone || "—"} />
              <InfoField label="Email" value={alumno.email || "—"} />
              <InfoField
                label="Fecha de alta"
                value={format(parseFechaLocal(alumno.joined_at), "dd/MM/yyyy", { locale: es })}
              />
              <InfoField label="Frecuencia semanal" value={frecuenciaLabel(alumno.weekly_frequency)} />
              <InfoField label="Estado" value={badge.label} />
              {alumno.notes && (
                <InfoField label="Notas" value={alumno.notes} className="whitespace-pre-wrap sm:col-span-2" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rutinas">
          <RutinasTabContent memberId={alumno.id} routinas={routinas} />
        </TabsContent>
        <TabsContent value="asistencia">
          <AlumnoAsistenciaTab attendances={attendances} weeklyFrequency={alumno.weekly_frequency} />
        </TabsContent>
        <TabsContent value="pagos">
          <PlaceholderTab text="Próximamente - Semana 4" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function RutinasTabContent({
  memberId,
  routinas,
}: {
  memberId: string;
  routinas: RoutineWithDayCount[];
}) {
  if (routinas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Este alumno todavía no tiene rutinas asignadas.</p>
          <NuevaRutinaDialog memberId={memberId} triggerLabel="Crear la primera" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NuevaRutinaDialog memberId={memberId} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {routinas.map((routine) => {
          const cantidadDias = routine.routine_days[0]?.count ?? 0;
          return (
            <Card key={routine.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{routine.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseFechaLocal(routine.created_at.slice(0, 10)), "dd/MM/yyyy", {
                        locale: es,
                      })}
                      {" · "}
                      {cantidadDias} {cantidadDias === 1 ? "día" : "días"}
                    </span>
                  </div>
                  <RutinaAcciones routine={routine} memberId={memberId} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/dashboard/alumnos/${memberId}/rutinas/${routine.id}`} />}
                  >
                    Ver rutina
                  </Button>
                  <DuplicarRutinaDialog routine={routine} memberId={memberId} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PlaceholderTab({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-16 text-center text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
