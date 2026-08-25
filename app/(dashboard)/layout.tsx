import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getDatePartsInBA } from "@/lib/attendance";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

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

  const [{ data: profile }, { count: alertasAbiertasCount }, { count: pagosVencidosCount }] =
    await Promise.all([
      supabase.from("users").select("full_name, gyms(name)").eq("id", user.id).single(),
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
    ]);

  const gymName =
    (profile?.gyms as unknown as { name: string } | null)?.name ?? "Tu gimnasio";
  const fullName = profile?.full_name ?? user.email ?? "";

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border md:flex md:flex-col print:hidden">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-base font-semibold tracking-tight">Constano</span>
        </div>
        <SidebarNav
          retentionAlertCount={alertasAbiertasCount ?? 0}
          pagosVencidosCount={pagosVencidosCount ?? 0}
        />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 print:hidden">
          <span className="text-sm font-medium text-muted-foreground">{gymName}</span>
          <UserMenu fullName={fullName} email={user.email ?? ""} />
        </header>
        <main className="flex-1 bg-muted/20 p-6 print:bg-white print:p-0">{children}</main>
      </div>
    </div>
  );
}
