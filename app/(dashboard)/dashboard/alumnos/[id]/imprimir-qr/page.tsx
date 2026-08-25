import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { nombreCompleto } from "@/lib/members";
import { buildCheckinScanUrl } from "@/lib/qr-checkin";
import { Card, CardContent } from "@/components/ui/card";
import { ImprimirQrView } from "@/components/alumnos/qr-checkin/imprimir-qr-view";
import type { Member } from "@/types/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImprimirQrPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const gymId = await getCurrentGymId();

  const [{ data: member }, { data: gym }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).single(),
    supabase.from("gyms").select("name, slug").eq("id", gymId).single(),
  ]);

  if (!member) {
    notFound();
  }

  const alumno = member as Member;

  if (!alumno.qr_token) {
    return (
      <div className="mx-auto max-w-md py-10 print:hidden">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Este alumno todavía no tiene un código QR generado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const scanUrl = buildCheckinScanUrl(gym?.slug ?? "", alumno.qr_token);

  return (
    <ImprimirQrView
      scanUrl={scanUrl}
      memberName={nombreCompleto(alumno.first_name, alumno.last_name)}
      gymName={gym?.name ?? "Tu gimnasio"}
    />
  );
}
