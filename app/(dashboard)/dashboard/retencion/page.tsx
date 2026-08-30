import Link from "next/link";
import { HeartPulseIcon } from "lucide-react";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { syncRetentionAlerts } from "@/lib/retention-alerts-engine";
import { nombreCompleto } from "@/lib/members";
import { getWhatsAppTemplate, type GymSettings } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertasFiltros } from "@/components/retencion-alertas/alertas-filtros";
import { AlertaCard } from "@/components/retencion-alertas/alerta-card";
import type { RetentionAlertStatus, RetentionAlertWithDetails } from "@/types/db";

const ESTADOS_VALIDOS: RetentionAlertStatus[] = ["active", "contacted", "resolved", "dismissed"];

type PageProps = {
  searchParams: Promise<{ q?: string; estado?: string }>;
};

export default async function RetencionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase() ?? "";
  const estadoParam = ESTADOS_VALIDOS.includes(params.estado as RetentionAlertStatus)
    ? (params.estado as RetentionAlertStatus)
    : undefined;

  const gymId = await getCurrentGymId();
  await syncRetentionAlerts(gymId);

  const supabase = await createClient();

  const [{ count: reglasActivasCount }, { data: gym }] = await Promise.all([
    supabase.from("retention_rules").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("gyms").select("name, settings").eq("id", gymId).single(),
  ]);

  const gymName = gym?.name ?? "el gimnasio";
  const whatsappTemplate = getWhatsAppTemplate(gym?.settings as GymSettings | null);

  let query = supabase
    .from("retention_alerts")
    .select(
      "*, members(id, first_name, last_name, phone, photo_url, weekly_frequency, status), retention_rules(id, name, days_without_attendance)"
    )
    .order("triggered_at", { ascending: false });

  if (estadoParam) {
    query = query.eq("status", estadoParam);
  } else if (!params.estado) {
    query = query.in("status", ["active", "contacted"]);
  }

  const { data } = await query;
  let alertas = (data ?? []) as unknown as RetentionAlertWithDetails[];

  if (q) {
    alertas = alertas.filter((alerta) =>
      nombreCompleto(alerta.members.first_name, alerta.members.last_name)
        .toLowerCase()
        .includes(q)
    );
  }

  const activas = alertas.filter((alerta) => alerta.status === "active").length;
  const contactadas = alertas.filter((alerta) => alerta.status === "contacted").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Retención</h1>
        <p className="text-muted-foreground">
          Alumnos que dejaron de venir según tus reglas de retención configuradas.
        </p>
      </div>

      {!reglasActivasCount ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <HeartPulseIcon className="size-8 text-muted-foreground" />
            <p className="font-medium text-foreground">Todavía no tenés reglas activas</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Configurá al menos una regla de retención para que Constano empiece a detectar
              alumnos en riesgo automáticamente.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/configuracion/retencion" />}
            >
              Configurar reglas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <AlertasFiltros />

          {alertas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="font-medium text-foreground">No hay alertas para mostrar</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  {params.estado || q
                    ? "Probá con otro filtro o búsqueda."
                    : "Ningún alumno activo está en riesgo por ahora. Buen trabajo."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {!params.estado && (
                <p className="text-sm text-muted-foreground">
                  {activas} {activas === 1 ? "alerta activa" : "alertas activas"}
                  {contactadas > 0 &&
                    ` · ${contactadas} ${contactadas === 1 ? "contactada" : "contactadas"}`}
                </p>
              )}
              <div className="flex flex-col gap-3">
                {alertas.map((alerta) => (
                  <AlertaCard
                    key={alerta.id}
                    alerta={alerta}
                    gymName={gymName}
                    whatsappTemplate={whatsappTemplate}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
