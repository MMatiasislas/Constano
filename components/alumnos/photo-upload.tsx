"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Loader2Icon, TrashIcon, UploadIcon } from "lucide-react";

import { MAX_PHOTO_SIZE_BYTES, PHOTO_EXT_BY_MIME } from "@/lib/storage/photo-validation";
import { getInitials } from "@/lib/members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type PhotoUploadProps = {
  initialPhotoUrl: string | null;
  firstName: string;
  lastName: string;
  onChange: (file: File | null, removed: boolean) => void;
};

export function PhotoUpload({ initialPhotoUrl, firstName, lastName, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPhotoUrl);
  const [compressing, setCompressing] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!(file.type in PHOTO_EXT_BY_MIME)) {
      toast.error("Formato no soportado", {
        description: "La foto tiene que ser JPG, PNG o WEBP.",
      });
      return;
    }

    let finalFile = file;

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setCompressing(true);
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        finalFile = await imageCompression(file, {
          maxSizeMB: 4,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
      } catch {
        // Si la compresión falla seguimos con el archivo original; la
        // validación de tamaño de abajo lo frena si sigue pesando de más.
      }
      setCompressing(false);
    }

    if (finalFile.size > MAX_PHOTO_SIZE_BYTES) {
      toast.error("La foto es muy pesada", { description: "El máximo es 5MB." });
      return;
    }

    setPreview(URL.createObjectURL(finalFile));
    onChange(finalFile, false);
  }

  function handleRemove() {
    setPreview(null);
    onChange(null, true);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="!size-24">
        {preview && <AvatarImage src={preview} alt="Foto del alumno" />}
        <AvatarFallback className="text-xl">
          {getInitials(firstName, lastName || null)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={compressing}
            onClick={() => inputRef.current?.click()}
          >
            {compressing ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
            {compressing ? "Comprimiendo..." : "Subir foto"}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <TrashIcon />
              Eliminar foto
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">JPG, PNG o WEBP. Máximo 5MB.</p>
      </div>
    </div>
  );
}
