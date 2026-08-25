import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getGymPublicInfo } from "@/lib/qr-checkin-public";
import { KioskScanner } from "@/components/checkin/kiosk-scanner";

type PageProps = {
  params: Promise<{ gymSlug: string }>;
};

export default async function KioskPage({ params }: PageProps) {
  const { gymSlug } = await params;
  const gym = await getGymPublicInfo(gymSlug);

  if (!gym) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay un staff logueado en ESTE dispositivo y es del mismo gym, se le
  // pide configurar el PIN antes de activar la cámara (solo la primera
  // vez). Un visitante anónimo (o staff de otro gym) nunca ve ese paso —
  // solo entra directo al modo escaneo.
  let isStaffOfThisGym = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("gym_id")
      .eq("id", user.id)
      .maybeSingle();
    isStaffOfThisGym = profile?.gym_id === gym.id;
  }

  return (
    <KioskScanner
      gymSlug={gymSlug}
      gymName={gym.name}
      hasKioskPin={gym.has_kiosk_pin}
      isStaffOfThisGym={isStaffOfThisGym}
      hasActiveSession={Boolean(user)}
    />
  );
}
