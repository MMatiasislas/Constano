"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";

import { deleteGymLogo, uploadGymLogo } from "@/app/(dashboard)/dashboard/configuracion/general/actions";
import { LOGO_ACCEPT, MAX_LOGO_SIZE_BYTES, LOGO_EXT_BY_MIME } from "@/lib/storage/gym-logo-validation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function GymLogoUpload({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!(file.type in LOGO_EXT_BY_MIME)) {
      toast.error("Formato no soportado", { description: "El logo tiene que ser JPG o PNG." });
      return;
    }

    let finalFile = file;
    setLoading(true);

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        finalFile = await imageCompression(file, {
          maxSizeMB: 4,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
      } catch {
        // Si la compresión falla seguimos con el archivo original; la
        // validación de tamaño de abajo lo frena si sigue pesando de más.
      }
    }

    if (finalFile.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("El logo es muy pesado", { description: "El máximo es 5MB." });
      setLoading(false);
      return;
    }

    setPreview(URL.createObjectURL(finalFile));

    const result = await uploadGymLogo(finalFile);
    setLoading(false);

    if ("error" in result) {
      toast.error("No pudimos subir el logo", { description: result.error });
      setPreview(logoUrl);
      return;
    }

    setLogoUrl(result.url);
    setPreview(result.url);
    toast.success("Logo actualizado");
  }

  async function handleRemove() {
    setLoading(true);
    const result = await deleteGymLogo();
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos eliminar el logo", { description: result.error });
      return;
    }

    setLogoUrl(null);
    setPreview(null);
    toast.success("Logo eliminado");
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 rounded-lg after:rounded-lg">
        {preview && <AvatarImage src={preview} alt="Logo del gimnasio" className="rounded-lg object-contain p-1" />}
        <AvatarFallback className="rounded-lg">
          <ImageIcon className="size-6 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {loading ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={handleRemove}>
              <TrashIcon />
              Eliminar
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">
          JPG o PNG. Máximo 5MB. Se usa en el encabezado del PDF de las rutinas.
        </p>
      </div>
    </div>
  );
}
