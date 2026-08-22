import { UsersIcon, DumbbellIcon, HeartPulseIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function diasRestantes(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, gyms(name, trial_ends_at, subscription_status)")
    .eq("id", user!.id)
    .single();

  const gym = profile?.gyms as unknown as {
    name: string;
    trial_ends_at: string | null;
    subscription_status: string;
  } | null;

  const primerNombre = profile?.full_name?.split(" ")[0] ?? "";
  const restantes = diasRestantes(gym?.trial_ends_at ?? null);
  const enPrueba = gym?.subscription_status === "trial";

  const [{ count: alumnosActivos }, { count: rutinasCount }, { count: alertasAbiertas }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("routines").select("*", { count: "exact", head: true }),
      supabase
        .from("retention_alerts")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "contacted"]),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {primerNombre ? `Hola, ${primerNombre}` : "Hola"}
        </h1>
        <p className="text-muted-foreground">
          Este es el resumen de {gym?.name ?? "tu gimnasio"}.
        </p>
      </div>

      {enPrueba && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Estás en período de prueba</CardTitle>
              <CardDescription>
                {restantes !== null
                  ? `Te quedan ${restantes} ${restantes === 1 ? "día" : "días"} de prueba gratis.`
                  : "Aprovechá tu prueba gratis de Constano."}
              </CardDescription>
            </div>
            <Badge>Prueba gratis</Badge>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <UsersIcon className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2">Alumnos</CardTitle>
            <CardDescription>
              {alumnosActivos
                ? `${alumnosActivos} ${alumnosActivos === 1 ? "alumno activo" : "alumnos activos"}`
                : "Todavía no cargaste alumnos."}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <DumbbellIcon className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2">Rutinas</CardTitle>
            <CardDescription>
              {rutinasCount
                ? `${rutinasCount} ${rutinasCount === 1 ? "rutina creada" : "rutinas creadas"}`
                : "Todavía no creaste rutinas."}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <HeartPulseIcon className="size-5 text-muted-foreground" />
            <CardTitle className="mt-2">Alertas de retención</CardTitle>
            <CardDescription>
              {alertasAbiertas
                ? `${alertasAbiertas} ${alertasAbiertas === 1 ? "alerta activa" : "alertas activas"}`
                : "Sin alertas por ahora."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
