import Link from "next/link";
import {
  UsersIcon,
  WalletIcon,
  CalendarCheckIcon,
  HeartPulseIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CakeIcon,
  ArrowRightIcon,
  CircleCheckIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { requireOwner } from "@/lib/auth/require-owner";
import { createClient } from "@/lib/supabase/server";
import { getDatePartsInBA } from "@/lib/attendance";
import { getInitials, nombreCompleto, parseFechaLocal } from "@/lib/members";
import { formatCurrency } from "@/lib/payments";
import {
  getActiveMembersCount,
  getAttendanceLast14Days,
  getMembershipStatusBreakdown,
  getMonthlyRevenue,
  getOpenRetentionAlertsCount,
  getRecentPayments,
  getRecentRetentionAlerts,
  getUpcomingBirthdays,
  getWeeklyAttendanceRate,
} from "@/lib/dashboard-stats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { MembershipStatusChart } from "@/components/dashboard/membership-status-chart";
import type { PaymentWithMember, RetentionAlertWithDetails } from "@/types/db";
import type { UpcomingBirthday } from "@/lib/dashboard-stats";

function diasRestantes(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function NegocioPage() {
  await requireOwner();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gymId = await getCurrentGymId();

  const [{ data: profile }, membersCount, monthlyRevenue, weeklyRate, openAlertsCount] =
    await Promise.all([
      supabase
        .from("users")
        .select("full_name, gyms(name, trial_ends_at, subscription_status)")
        .eq("id", user!.id)
        .single(),
      getActiveMembersCount(gymId),
      getMonthlyRevenue(gymId),
      getWeeklyAttendanceRate(gymId),
      getOpenRetentionAlertsCount(gymId),
    ]);

  const [attendanceLast14Days, membershipBreakdown, recentAlerts, recentPayments, birthdays] =
    await Promise.all([
      getAttendanceLast14Days(gymId),
      getMembershipStatusBreakdown(gymId),
      getRecentRetentionAlerts(gymId, 5),
      getRecentPayments(gymId, 5),
      getUpcomingBirthdays(gymId),
    ]);

  const gym = profile?.gyms as unknown as {
    name: string;
    trial_ends_at: string | null;
    subscription_status: string;
  } | null;

  const primerNombre = profile?.full_name?.split(" ")[0] ?? "";
  const restantes = diasRestantes(gym?.trial_ends_at ?? null);
  const enPrueba = gym?.subscription_status === "trial";

  const hoyParts = getDatePartsInBA(new Date());
  const hoyLocal = new Date(hoyParts.year, hoyParts.month - 1, hoyParts.day);
  const fechaLabel = capitalizar(format(hoyLocal, "EEEE d 'de' MMMM", { locale: es }));

  const hayAsistenciasEnRango = attendanceLast14Days.some((dia) => dia.count > 0);
  const totalMembershipBreakdown = Object.values(membershipBreakdown).reduce(
    (a, b) => a + b,
    0
  );

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

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={UsersIcon}
          label="Alumnos activos"
          value={String(membersCount.count)}
          footer={
            membersCount.count === 0 ? (
              <span className="text-muted-foreground">Todavía no cargaste alumnos</span>
            ) : membersCount.delta === 0 ? (
              <span className="text-muted-foreground">Sin cambios este mes</span>
            ) : membersCount.delta > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <TrendingUpIcon className="size-3.5" />+{membersCount.delta} este mes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingDownIcon className="size-3.5" />
                {membersCount.delta} este mes
              </span>
            )
          }
        />
        <KpiCard
          icon={WalletIcon}
          label="Ingresos del mes"
          value={formatCurrency(monthlyRevenue)}
          footer={<span className="text-muted-foreground">Pagos registrados este mes</span>}
        />
        <KpiCard
          icon={CalendarCheckIcon}
          label="Asistencia semanal"
          value={`${weeklyRate}%`}
          footer={<span className="text-muted-foreground">Alumnos que vinieron esta semana</span>}
        />
        <KpiCard
          icon={HeartPulseIcon}
          label="Alertas de retención"
          value={String(openAlertsCount)}
          href="/dashboard/retencion"
          footer={
            openAlertsCount === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CircleCheckIcon className="size-3.5" />
                Todo bajo control
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-foreground">
                Ver todas <ArrowRightIcon className="size-3.5" />
              </span>
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asistencia · últimos 14 días</CardTitle>
            <CardDescription>Check-ins registrados por día</CardDescription>
          </CardHeader>
          <CardContent>
            {hayAsistenciasEnRango ? (
              <AttendanceChart data={attendanceLast14Days} />
            ) : (
              <EmptyChartState texto="Todavía no hay asistencias registradas en los últimos 14 días." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estado de cuotas</CardTitle>
            <CardDescription>Alumnos activos según su membership</CardDescription>
          </CardHeader>
          <CardContent>
            {totalMembershipBreakdown > 0 ? (
              <MembershipStatusChart breakdown={membershipBreakdown} />
            ) : (
              <EmptyChartState texto="Todavía no hay alumnos activos para mostrar el estado de cuotas." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Alertas recientes</CardTitle>
            <CardDescription>Últimas alertas de retención abiertas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentAlerts.length === 0 ? (
              <EmptyListState texto="No hay alertas de retención abiertas." />
            ) : (
              recentAlerts.map((alerta) => <AlertaListItem key={alerta.id} alerta={alerta} />)
            )}
            <Link
              href="/dashboard/retencion"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              Ver todas <ArrowRightIcon className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos pagos</CardTitle>
            <CardDescription>Los cobros más recientes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentPayments.length === 0 ? (
              <EmptyListState texto="Todavía no se registraron pagos." />
            ) : (
              recentPayments.map((pago) => <PagoListItem key={pago.id} pago={pago} />)
            )}
            <Link
              href="/dashboard/pagos"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              Ver todos <ArrowRightIcon className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cumpleaños próximos</CardTitle>
            <CardDescription>Alumnos activos en los próximos 30 días</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {birthdays.length === 0 ? (
              <EmptyListState texto="No hay cumpleaños próximos." />
            ) : (
              birthdays.map((cumple) => <CumpleListItem key={cumple.member.id} cumple={cumple} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyChartState({ texto }: { texto: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

function EmptyListState({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground">{texto}</p>;
}

function AlertaListItem({ alerta }: { alerta: RetentionAlertWithDetails }) {
  const alumno = alerta.members;
  const nombre = nombreCompleto(alumno.first_name, alumno.last_name);

  return (
    <Link
      href={`/dashboard/alumnos/${alumno.id}`}
      className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted"
    >
      <Avatar size="sm">
        {alumno.photo_url && <AvatarImage src={alumno.photo_url} alt={nombre} />}
        <AvatarFallback>{getInitials(alumno.first_name, alumno.last_name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-xs text-muted-foreground">
          {alerta.days_without_attendance} días sin venir
        </span>
      </div>
    </Link>
  );
}

function PagoListItem({ pago }: { pago: PaymentWithMember }) {
  const alumno = pago.members;
  const nombre = nombreCompleto(alumno.first_name, alumno.last_name);

  return (
    <Link
      href={`/dashboard/alumnos/${alumno.id}`}
      className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted"
    >
      <Avatar size="sm">
        {alumno.photo_url && <AvatarImage src={alumno.photo_url} alt={nombre} />}
        <AvatarFallback>{getInitials(alumno.first_name, alumno.last_name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-xs text-muted-foreground">
          {format(parseFechaLocal(pago.paid_at.slice(0, 10)), "dd/MM/yyyy", { locale: es })}
        </span>
      </div>
      <span className="shrink-0 text-sm font-medium text-foreground">
        {formatCurrency(pago.amount)}
      </span>
    </Link>
  );
}

function CumpleListItem({ cumple }: { cumple: UpcomingBirthday }) {
  const nombre = nombreCompleto(cumple.member.first_name, cumple.member.last_name);

  return (
    <Link
      href={`/dashboard/alumnos/${cumple.member.id}`}
      className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-muted"
    >
      <Avatar size="sm">
        {cumple.member.photo_url && (
          <AvatarImage src={cumple.member.photo_url} alt={nombre} />
        )}
        <AvatarFallback>
          {getInitials(cumple.member.first_name, cumple.member.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{nombre}</span>
        <span className="text-xs text-muted-foreground">
          {cumple.daysUntil === 0 ? "¡Hoy!" : cumple.label}
        </span>
      </div>
      <CakeIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
