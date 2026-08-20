import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

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

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, gyms(name)")
    .eq("id", user.id)
    .single();

  const gymName =
    (profile?.gyms as unknown as { name: string } | null)?.name ?? "Tu gimnasio";
  const fullName = profile?.full_name ?? user.email ?? "";

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-base font-semibold tracking-tight">Constano</span>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-medium text-muted-foreground">{gymName}</span>
          <UserMenu fullName={fullName} email={user.email ?? ""} />
        </header>
        <main className="flex-1 bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
