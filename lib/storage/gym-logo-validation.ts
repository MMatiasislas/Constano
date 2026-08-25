// Validación pura (sin imports de servidor), mismo patrón que photo-validation.ts.
// Restringido a JPG/PNG (no WEBP ni SVG): @react-pdf/renderer —la librería que
// arma el PDF de las rutinas— solo puede insertar imágenes JPG/PNG en el PDF.
// Un logo en otro formato quedaría subido pero invisible en el PDF, sin avisar,
// así que preferimos no ofrecerlo como opción en el uploader.

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

export const LOGO_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const LOGO_ACCEPT = Object.keys(LOGO_EXT_BY_MIME).join(",");

export function validateGymLogoFile(file: File) {
  if (!(file.type in LOGO_EXT_BY_MIME)) {
    throw new Error("El logo tiene que ser JPG o PNG.");
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("El logo no puede pesar más de 5MB.");
  }
}
