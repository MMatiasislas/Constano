import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CalendarCheckIcon,
  HeartPulseIcon,
  UsersIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { isOwner } from "@/lib/auth/require-owner";
import { createClient } from "@/lib/supabase/server";
import { getDatePartsInBA } from "@/lib/attendance";
import {
  getActiveMembersCount,
  getOpenRetentionAlertsCount,
  getWeeklyAttendanceRate,
} from "@/lib/dashboard-stats";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const QUICK_LINKS = [
  {
    href: "/dashboard/alumnos",
    label: "Alumnos",
    description: "Cargá o buscá un alumno",
    icon: UsersIcon,
  },
  {
    href: "/dashboard/asistencia",
    label: "Asistencia",
    description: "Marcá quién vino hoy",
    icon: CalendarCheckIcon,
  },
  {
    href: "/dashboard/retencion",
    label: "Retención",
    description: "Alumnos en riesgo de baja",
    icon: HeartPulseIcon,
  },
];

/**
 * Home liviana del dashboard — el panel pesado con ingresos/facturación se
 * mudó a /dashboard/negocio (solo owner, ver requireOwner() en
 * lib/auth/require-owner.ts). Esta pantalla es un launcher simple: al
 * staff le muestra directo los accesos rápidos; al owner además le suma 3
 * KPIs sin plata de por medio (nunca ingresos acá) y una card destacada
 * hacia el panel de negocio.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gymId = await getCurrentGymId();
  const owner = await isOwner();

  const [{ data: profile }, membersCount, weeklyRate, openAlertsCount] = await Promise.all([
    supabase.from("users").select("full_name, gyms(name)").eq("id", user!.id).single(),
    owner ? getActiveMembersCount(gymId) : Promise.resolve(null),
    owner ? getWeeklyAttendanceRate(gymId) : Promise.resolve(null),
    owner ? getOpenRetentionAlertsCount(gymId) : Promise.resolve(null),
  ]);

  const gym = profile?.gyms as unknown as { name: string } | null;
  const primerNombre = profile?.full_name?.split(" ")[0] ?? "";

  const hoyParts = getDatePartsInBA(new Date());
  const hoyLocal = new Date(hoyParts.year, hoyParts.month - 1, hoyParts.day);
  const fechaLabel = capitalizar(format(hoyLocal, "EEEE d 'de' MMMM", { locale: es }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {primerNombre ? `Hola, ${primerNombre}` : "Hola"}
        </h1>
        <p className="text-muted-foreground">
          {fechaLabel} · {gym?.name ?? "tu gimnasio"}
        </p>
      </div>

      {owner && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <KpiCard icon={UsersIcon} label="Alumnos activos" value={String(membersCount?.count ?? 0)} />
          <KpiCard icon={CalendarCheckIcon} label="Asistencia semanal" value={`${weeklyRate ?? 0}%`} />
          <KpiCard
            icon={HeartPulseIcon}
            label="Alertas de retención"
            value={String(openAlertsCount ?? 0)}
            href="/dashboard/retencion"
          />
        </div>
      )}

      {owner && (
        <Link href="/dashboard/negocio" className="block">
          <Card className="transition-colors hover:ring-foreground/20">
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium text-foreground">Ver panel de negocio</p>
                  <p className="text-sm text-muted-foreground">
                    Ingresos, facturación y métricas del gimnasio
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Accesos rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="block h-full">
              <Card className="h-full transition-colors hover:ring-foreground/20">
                <CardContent className="flex items-start gap-3 py-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <link.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{link.label}</p>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
