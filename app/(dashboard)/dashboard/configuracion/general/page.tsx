import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GymLogoUpload } from "@/components/configuracion/gym-logo-upload";

export default async function ConfiguracionGeneralPage() {
  const gymId = await getCurrentGymId();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gyms")
    .select("name, logo_url")
    .eq("id", gymId)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">General</h1>
        <p className="text-muted-foreground">Datos generales del gimnasio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del gimnasio</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium text-foreground">{gym?.name}</p>
          <GymLogoUpload initialLogoUrl={gym?.logo_url ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
