import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { getKioskPin } from "@/lib/qr-checkin";
import { type GymSettings } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import { KioscoPinForm } from "@/components/configuracion/kiosco-pin-form";

export default async function KioscoConfigPage() {
  const gymId = await getCurrentGymId();
  const supabase = await createClient();

  const [{ data: gym }] = await Promise.all([
    supabase.from("gyms").select("name, slug, settings").eq("id", gymId).single(),
  ]);

  const currentPin = getKioskPin(gym?.settings as GymSettings | null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Modo kiosco</h1>
        <p className="text-muted-foreground">
          Configurá el PIN de 4 dígitos que pide la pantalla de check-in por QR para poder salir
          de ese modo.
        </p>
      </div>

      <KioscoPinForm currentPin={currentPin} gymSlug={gym?.slug ?? ""} />
    </div>
  );
}
