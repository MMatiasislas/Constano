import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { AceptarInvitacionForm } from "@/components/invitacion/aceptar-invitacion-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Página pública, sin sesión — no puede leer team_invitations con el
  // cliente normal (RLS la restringe a 'owner' del propio gym). Se usa
  // service_role acá adentro, server-side únicamente, para validar el
  // token sin exponer nada al cliente.
  const supabase = createServiceRoleClient();
  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("email, status, expires_at, gyms(name)")
    .eq("token", token)
    .maybeSingle();

  const isValid =
    !!invitation && invitation.status === "pending" && new Date(invitation.expires_at) > new Date();

  if (!isValid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="text-lg font-semibold tracking-tight">Constano</span>
          <CardTitle className="text-xl">Este link ya no es válido</CardTitle>
          <CardDescription>
            Este link de invitación no es válido o ya expiró. Pedile al dueño del gimnasio que te
            envíe uno nuevo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const gymName = (invitation.gyms as unknown as { name: string } | null)?.name ?? "el gimnasio";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <span className="text-lg font-semibold tracking-tight">Constano</span>
        <CardTitle className="text-xl">Sumate al equipo de {gymName}</CardTitle>
        <CardDescription>Completá tus datos para crear tu cuenta de staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <AceptarInvitacionForm token={token} email={invitation.email} />
      </CardContent>
    </Card>
  );
}
