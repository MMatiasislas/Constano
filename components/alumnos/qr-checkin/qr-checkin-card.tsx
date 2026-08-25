"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircleIcon, PrinterIcon, QrCodeIcon, RefreshCwIcon } from "lucide-react";

import { generateMemberQrToken } from "@/app/(dashboard)/dashboard/alumnos/[id]/actions";
import { buildCheckinScanUrl, buildMiQrUrl } from "@/lib/qr-checkin";
import { whatsappHref } from "@/lib/members";
import { QrCodeImage } from "@/components/checkin/qr-code-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function QrCheckinCard({
  memberId,
  memberName,
  memberPhone,
  initialToken,
  gymSlug,
}: {
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  initialToken: string | null;
  gymSlug: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateMemberQrToken(memberId);
    setLoading(false);

    if ("error" in result) {
      toast.error("No pudimos generar el código QR", { description: result.error });
      return;
    }

    setToken(result.token);
    toast.success("Código QR generado");
    router.refresh();
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <QrCodeIcon className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Check-in por QR</p>
            <p className="text-sm text-muted-foreground">
              Generá un código QR único para que este alumno marque su entrada solo, sin pasar
              por el mostrador.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generando..." : "Generar código QR"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scanUrl = buildCheckinScanUrl(gymSlug, token);
  const miQrUrl = buildMiQrUrl(gymSlug, token);
  const mensajeWhatsapp = `Hola ${memberName}! Acá está tu código QR para marcar tu entrada al gimnasio: ${miQrUrl}. Guardalo o mostralo en la entrada.`;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="font-medium text-foreground">Check-in por QR</p>
        <QrCodeImage value={scanUrl} size={180} className="rounded-lg" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/dashboard/alumnos/${memberId}/imprimir-qr`} target="_blank" />}
          >
            <PrinterIcon />
            Ver / Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a
                href={
                  memberPhone
                    ? whatsappHref(memberPhone, mensajeWhatsapp)
                    : `https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp)}`
                }
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MessageCircleIcon />
            Enviar por WhatsApp
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
              <RefreshCwIcon />
              Regenerar QR
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Regenerar el código QR?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto invalida el QR anterior — si ya lo imprimiste o lo enviaste, va a dejar de
                  funcionar. ¿Continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerate} disabled={loading}>
                  {loading ? "Regenerando..." : "Regenerar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
