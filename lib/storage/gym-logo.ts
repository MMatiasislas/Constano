import { createClient } from "@/lib/supabase/server";
import { LOGO_EXT_BY_MIME, validateGymLogoFile } from "./gym-logo-validation";

const BUCKET = "gym-assets";

export async function uploadGymLogo(file: File, gymId: string): Promise<string> {
  validateGymLogoFile(file);

  const ext = LOGO_EXT_BY_MIME[file.type];
  const path = `${gymId}/logo.${ext}`;
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error("No pudimos subir el logo. Intentá de nuevo.");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust: el path es siempre el mismo (upsert), así que sin esto el
  // browser puede seguir mostrando el logo viejo cacheado.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteGymLogo(gymId: string): Promise<void> {
  // Borramos las 2 extensiones posibles por robustez, mismo motivo que
  // deleteMemberPhoto: si el gym tuvo un logo.jpg y ahora sube uno .png, no
  // queremos dejar el .jpg viejo huérfano en el bucket.
  const supabase = await createClient();
  const paths = Object.values(LOGO_EXT_BY_MIME).map((ext) => `${gymId}/logo.${ext}`);
  await supabase.storage.from(BUCKET).remove(paths);
}
