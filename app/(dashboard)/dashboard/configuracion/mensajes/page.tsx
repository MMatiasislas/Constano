import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { getWhatsAppTemplate, type GymSettings } from "@/lib/retention";
import { createClient } from "@/lib/supabase/server";
import { MensajeRetencionForm } from "@/components/mensajes/mensaje-retencion-form";

export default async function MensajesConfigPage() {
  const gymId = await getCurrentGymId();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gyms")
    .select("name, settings")
    .eq("id", gymId)
    .single();

  const gymName = gym?.name ?? "tu gimnasio";
  const initialMessage = getWhatsAppTemplate(gym?.settings as GymSettings | null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Mensaje de retención</h1>
        <p className="text-muted-foreground">
          Personalizá el mensaje que aparece cuando abrís WhatsApp desde una alerta de retención.
          Podés usar las variables {"{nombre}"}, {"{dias}"} y {"{gym}"} que se reemplazan
          automáticamente.
        </p>
      </div>

      <MensajeRetencionForm initialMessage={initialMessage} gymName={gymName} />
    </div>
  );
}
