import { createClient } from "@/lib/supabase/server";
import { PHOTO_EXT_BY_MIME, validateMemberPhotoFile } from "./photo-validation";

const BUCKET = "member-photos";

export async function uploadMemberPhoto(
  file: File,
  gymId: string,
  memberId: string
): Promise<string> {
  validateMemberPhotoFile(file);

  const ext = PHOTO_EXT_BY_MIME[file.type];
  const path = `${gymId}/${memberId}.${ext}`;
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error("No pudimos subir la foto. Intentá de nuevo.");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust: el path es siempre el mismo (upsert), así que sin esto el
  // browser puede seguir mostrando la imagen vieja cacheada.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteMemberPhoto(
  photoUrl: string,
  gymId: string,
  memberId: string
): Promise<void> {
  if (!photoUrl) return;

  const supabase = await createClient();
  // Borramos las 3 extensiones posibles: si el alumno tuvo una foto .jpg y
  // ahora sube una .png, no queremos dejar el .jpg viejo huérfano en el bucket.
  const paths = Object.values(PHOTO_EXT_BY_MIME).map((ext) => `${gymId}/${memberId}.${ext}`);
  await supabase.storage.from(BUCKET).remove(paths);
}
