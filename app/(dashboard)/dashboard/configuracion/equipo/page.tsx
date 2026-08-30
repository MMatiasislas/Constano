import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { requireOwner } from "@/lib/auth/require-owner";
import { createClient } from "@/lib/supabase/server";
import { InvitarMiembroDialog } from "@/components/equipo/invitar-miembro-dialog";
import { InvitacionesTable } from "@/components/equipo/invitaciones-table";
import { MiembrosTable } from "@/components/equipo/miembros-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TeamInvitation, TeamMember } from "@/types/db";

export default async function EquipoPage() {
  await requireOwner();

  const gymId = await getCurrentGymId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: membersData }, { data: invitationsData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, gym_id, email, full_name, role, created_at")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_invitations")
      .select("*")
      .eq("gym_id", gymId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const members = (membersData ?? []) as TeamMember[];
  const invitations = (invitationsData ?? []) as TeamInvitation[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Equipo</h1>
          <p className="text-muted-foreground">
            Invitá a tus profes o encargados para que usen Constano con vos.
          </p>
        </div>
        <InvitarMiembroDialog />
      </div>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones pendientes</CardTitle>
            <CardDescription>Todavía no aceptaron el link que les mandaste.</CardDescription>
          </CardHeader>
          <CardContent>
            <InvitacionesTable invitations={invitations} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Miembros del equipo</CardTitle>
          <CardDescription>{members.length} en total.</CardDescription>
        </CardHeader>
        <CardContent>
          <MiembrosTable members={members} currentUserId={user?.id ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
