import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { getDatePartsInBA } from "@/lib/attendance";
import { resolveSubscriptionStatus } from "@/lib/subscription";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { OnboardingDialog } from "@/components/dashboard/onboarding-dialog";
import { QueryToast } from "@/components/dashboard/query-toast";
import { SubscriptionBanner } from "@/components/suscripcion/subscription-banner";

function hoyEnBAString() {
  const { year, month, day } = getDatePartsInBA(new Date());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gymId = await getCurrentGymId();

  const [{ data: profile }, { count: alertasAbiertasCount }, { count: pagosVencidosCount }, statusInfo] =
    await Promise.all([
      supabase
        .from("users")
        .select("full_name, onboarding_seen_at, role, gyms(name)")
        .eq("id", user.id)
        .single(),
      // Solo cuenta `active` (no `contacted`): el badge es un indicador de
      // "casos nuevos sin atender todavía" — apenas alguien marca una como
      // contactada, ya está siendo trabajada y no debería seguir inflando el
      // número. Distinto del resumen de Inicio, que sí suma ambos estados
      // porque ahí se busca una foto general de "cuántas alertas abiertas hay".
      supabase
        .from("retention_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      // "Vencido" no es una columna: memberships activas cuyo end_date ya
      // pasó, del mismo alumno activo que ve el panel de Pagos. Mismo patrón
      // de `!inner` + filtro anidado que el contador de "presentes hoy" de
      // Asistencia (Semana 4), para no traer todas las filas solo a contar.
      supabase
        .from("memberships")
        .select("id, members!inner(status)", { count: "exact", head: true })
        .eq("status", "active")
        .lt("end_date", hoyEnBAString())
        .eq("members.status", "active"),
      resolveSubscriptionStatus(gymId),
    ]);

  const gymName =
    (profile?.gyms as unknown as { name: string } | null)?.name ?? "Tu gimnasio";
  const fullName = profile?.full_name ?? user.email ?? "";
  const showOnboarding = !profile?.onboarding_seen_at;
  const userIsOwner = profile?.role === "owner";

  return (
    // `data-dashboard-theme` activa la paleta del dashboard (ver
    // app/globals.css) — todo lo que cuelga de acá (sidebar, header, las
    // páginas de /dashboard/*) hereda fondo/acento/colores de estado por
    // cascada de CSS, sin tocar cada componente. La landing pública y
    // /login /signup quedan afuera de este div, con la paleta neutra de
    // siempre.
    <div className="flex flex-1 bg-background text-foreground" data-dashboard-theme="">
      <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col print:hidden">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="text-base font-semibold tracking-tight">Constano</span>
        </div>
        <SidebarNav
          retentionAlertCount={alertasAbiertasCount ?? 0}
          pagosVencidosCount={pagosVencidosCount ?? 0}
          isOwner={userIsOwner}
        />
      </aside>
      <div className="flex flex-1 flex-col">
        <QueryToast />
        <SubscriptionBanner statusInfo={statusInfo} />
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 print:hidden">
          <span className="text-sm font-medium text-muted-foreground">{gymName}</span>
          <UserMenu fullName={fullName} email={user.email ?? ""} />
        </header>
        <main className="flex-1 bg-background p-6 print:bg-white print:p-0">{children}</main>
      </div>
      {showOnboarding && <OnboardingDialog defaultOpen />}
    </div>
  );
}
