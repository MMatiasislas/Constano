import { format } from "date-fns";
import { es } from "date-fns/locale";
import { QrCodeIcon } from "lucide-react";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { getEndOfDayISO, getStartOfDayISO } from "@/lib/attendance";
import { nombreCompleto } from "@/lib/members";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AsistenciaFiltros } from "@/components/asistencia/asistencia-filtros";
import { AsistenciaLista } from "@/components/asistencia/asistencia-lista";
import type { Member, MemberStatus, MemberWithTodayAttendance } from "@/types/db";

// Filtra por nombre completo (first_name + last_name concatenados) además
// de cada campo por separado, para que buscar "Ana Regresion" encuentre a
// "Ana Regresion Editada" igual que buscar solo "Ana" o solo "Regresion".
// PostgREST no permite un `ilike` sobre una expresión concatenada en el
// query string (solo sobre columnas reales), así que este filtro corre acá
// del lado del servidor de Next después de traer los alumnos del gym — un
// listado por gym es chico, no hace falta que lo resuelva la DB.
function coincideConBusqueda(member: Pick<Member, "first_name" | "last_name" | "phone">, q: string) {
  const texto = q.trim().toLowerCase();
  if (!texto) return true;

  const nombreCompletoTexto = nombreCompleto(member.first_name, member.last_name).toLowerCase();
  const telefono = (member.phone ?? "").toLowerCase();

  return nombreCompletoTexto.includes(texto) || telefono.includes(texto);
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type PageProps = {
  searchParams: Promise<{ q?: string; pausados?: string }>;
};

export default async function AsistenciaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const incluirPausados = params.pausados === "1";

  const supabase = await createClient();

  const estados: MemberStatus[] = incluirPausados ? ["active", "paused"] : ["active"];

  const query = supabase
    .from("members")
    .select("*, attendances(id, checked_in_at, checked_in_by)")
    .in("status", estados)
    .gte("attendances.checked_in_at", getStartOfDayISO())
    .lt("attendances.checked_in_at", getEndOfDayISO())
    .order("first_name", { ascending: true });

  const gymId = await getCurrentGymId();

  const [{ data }, { count: totalCount }, { count: presentesHoyCount }, { data: gym }] =
    await Promise.all([
      query,
      supabase.from("members").select("*", { count: "exact", head: true }).in("status", estados),
      supabase
        .from("attendances")
        .select("member_id, members!inner(status)", { count: "exact", head: true })
        .gte("checked_in_at", getStartOfDayISO())
        .lt("checked_in_at", getEndOfDayISO())
        .in("members.status", estados),
      supabase.from("gyms").select("slug").eq("id", gymId).single(),
    ]);
  const members = ((data ?? []) as MemberWithTodayAttendance[]).filter((member) =>
    coincideConBusqueda(member, q)
  );
  const presentesHoy = presentesHoyCount ?? 0;
  const gymSlug = gym?.slug ?? "";

  const fechaLarga = capitalizar(
    format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Asistencia</h1>
          <p className="text-muted-foreground">{fechaLarga}</p>
        </div>
        <div className="flex items-center gap-3">
          {gymSlug && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/checkin/${gymSlug}`} target="_blank" rel="noopener noreferrer" />}
            >
              <QrCodeIcon />
              Abrir modo kiosco (QR)
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-subtle px-4 py-2">
            <span className="text-2xl font-medium text-success">
              {presentesHoy}
            </span>
            <span className="text-sm text-success">
              {presentesHoy === 1 ? "presente hoy" : "presentes hoy"}
            </span>
          </div>
        </div>
      </div>

      {(totalCount ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            Todavía no tenés alumnos activos. Cargá alumnos para empezar a registrar asistencia.
          </CardContent>
        </Card>
      ) : (
        <>
          <AsistenciaFiltros />
          {members.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                No encontramos alumnos con esos filtros.
              </CardContent>
            </Card>
          ) : (
            <AsistenciaLista members={members} />
          )}
        </>
      )}
    </div>
  );
}
