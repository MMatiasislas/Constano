// Validación pura (sin imports de servidor) para poder usarla tanto en
// componentes cliente (feedback instantáneo) como en lib/storage/member-photos.ts.

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export const PHOTO_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateMemberPhotoFile(file: File) {
  if (!(file.type in PHOTO_EXT_BY_MIME)) {
    throw new Error("La foto tiene que ser JPG, PNG o WEBP.");
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error("La foto no puede pesar más de 5MB.");
  }
}
